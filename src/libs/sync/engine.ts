import { archivedMedia, mediaKind, SyncJournal } from './journal';
import { SyncClient, SyncEntry, SyncSummary } from './types';

const running = new Map<string, Promise<SyncSummary>>();
/** Preserve every JSON item remotely before domain validation or a slow history rebuild. */
export async function runSync(journal: SyncJournal, client: SyncClient, options?: {
    onProgress?: (summary: SyncSummary) => void; shouldCancel?: () => boolean; maxAttempts?: number;
}): Promise<SyncSummary> {
    if (running.has(journal.key)) return running.get(journal.key)!;
    const task = (async () => {
        let authStopped = false;
        const authFailure = (error: any) => error?.code === 'AUTH_SESSION_CHANGED' || error?.code === 'AUTH_EXPIRED' || (error?.response?.status || error?.status) === 401;
        const progress = async () => { try { options?.onProgress?.(await journal.summary()); } catch { /* UI cannot stop delivery. */ } };
        if (client.receipts) {
            try {
                const known = (await journal.read()).entries;
                for (const receipt of (await client.receipts(journal.context)).operations) {
                    if (known.some((e) => e.operation.operationId === receipt.operationId)) await journal.updateReceipt(receipt);
                }
            } catch (error) { if (authFailure(error)) authStopped = true; }
        }
        const entries = (await journal.read()).entries;
        const frozen: SyncEntry[] = [];
        const seen = new Set<string>();
        const visit = (entry: SyncEntry) => {
            if (seen.has(entry.operation.operationId)) return;
            seen.add(entry.operation.operationId);
            for (const id of entry.operation.dependsOn || []) {
                const dependency = entries.find((item) => item.operation.operationId === id);
                if (dependency) visit(dependency);
            }
            frozen.push(entry);
        };
        entries.forEach(visit);
        const intake = frozen.filter((entry) => !mediaKind(entry.operation.kind) &&
            entry.receipt.state !== 'APPLIED' && !entry.receipt.receivedAt);
        const intakeOne = async (entry: SyncEntry) => {
            try {
                await journal.attempted(entry.operation.operationId);
                const result = await client.send([entry.operation], journal.context, { deferApplication: true });
                const receipt = result.receipts.find((r) => r.operationId === entry.operation.operationId);
                if (!receipt) throw new Error('Recebimento não confirmado. A coleta continua no aparelho.');
                await journal.updateReceipt(receipt);
            } catch (error) { await journal.fail(entry.operation.operationId, error); if (authFailure(error)) authStopped = true; }
        };
        for (let start = 0; start < intake.length; start += 25) {
            if (options?.shouldCancel?.() || authStopped) break;
            const batch = intake.slice(start, start + 25);
            try {
                for (const entry of batch) await journal.attempted(entry.operation.operationId);
                const result = await client.send(batch.map((entry) => entry.operation), journal.context, { deferApplication: true });
                const confirmed = new Set<string>();
                for (const receipt of result.receipts) {
                    if (!batch.some((entry) => entry.operation.operationId === receipt.operationId)) continue;
                    await journal.updateReceipt(receipt); confirmed.add(receipt.operationId);
                }
                for (const entry of batch) if (!confirmed.has(entry.operation.operationId)) await intakeOne(entry);
            } catch (error: any) {
                // A malformed/oversized item cannot block the valid members of its batch.
                const status = error?.response?.status || error?.status;
                if (authFailure(error)) authStopped = true;
                for (const entry of batch) {
                    if (options?.shouldCancel?.()) break;
                    if (status === 401 || status === 403) await journal.fail(entry.operation.operationId, error);
                    else await intakeOne(entry);
                }
            }
            await progress();
        }
        // Rescue all binaries before a slow domain/history mutation can consume the remaining connection.
        const media = frozen.filter((entry) => mediaKind(entry.operation.kind));
        const deliverMedia = async (entry: SyncEntry) => {
            if (authStopped || options?.shouldCancel?.()) return;
            const current = (await journal.read()).entries.find((item) => item.operation.operationId === entry.operation.operationId)!;
            if (current.receipt.state === 'APPLIED' || archivedMedia(current, (await journal.read()).entries)) return;
            try {
                await journal.attempted(entry.operation.operationId);
                const receipt = await client.upload?.(entry.operation, journal.context);
                if (!receipt) throw new Error('Arquivo não confirmado. Ele continua no aparelho.');
                await journal.updateReceipt(receipt);
            } catch (error) { await journal.fail(entry.operation.operationId, error); if (authFailure(error)) authStopped = true; }
            await progress();
        };
        let nextMedia = 0;
        await Promise.all([0, 1].map(async () => {
            while (nextMedia < media.length && !authStopped && !options?.shouldCancel?.()) {
                const entry = media[nextMedia++];
                await deliverMedia(entry);
            }
        }));
        // Applying is a separate pass. A receipt from phase one is a durable backup, never an applied acknowledgement.
        for (const entry of frozen) {
            if (options?.shouldCancel?.() || authStopped) break;
            const current = (await journal.read()).entries.find((item) => item.operation.operationId === entry.operation.operationId)!;
            if (mediaKind(entry.operation.kind) || current.receipt.state === 'APPLIED' || current.receipt.state === 'NEEDS_REVIEW') continue;
            const attempts = Math.max(1, Math.min(options?.maxAttempts || 3, 3));
            for (let attempt = 0; attempt < attempts; attempt += 1) {
                try {
                    await journal.attempted(entry.operation.operationId);
                    const receipt = (await client.send([entry.operation], journal.context)).receipts.find((r) => r.operationId === entry.operation.operationId);
                    if (!receipt) throw new Error('O servidor não confirmou este item. Ele permanece no aparelho.');
                    await journal.updateReceipt(receipt);
                    break;
                } catch (error: any) {
                    await journal.fail(entry.operation.operationId, error);
                    const status = error?.response?.status || error?.status;
                    if (authFailure(error)) authStopped = true;
                    if (status && status < 500 && ![408, 429].includes(status)) break;
                    if (options?.shouldCancel?.()) break;
                }
            }
            await progress();
        }
        // A durable binary may now be linked after its parent was applied. Never re-upload its bytes.
        for (const entry of media) {
            if (authStopped || options?.shouldCancel?.()) break;
            const current = (await journal.read()).entries.find((item) => item.operation.operationId === entry.operation.operationId)!;
            if (current.receipt.durable && current.receipt.state !== 'APPLIED') await deliverMedia(entry);
        }
        return journal.summary();
    })();
    running.set(journal.key, task);
    try { return await task; } finally { if (running.get(journal.key) === task) running.delete(journal.key); }
}
