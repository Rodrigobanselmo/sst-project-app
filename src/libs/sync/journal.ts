import { SyncBase, SyncContext, SyncDocument, SyncDraft, SyncEntry, SyncKind, SyncOperation, SyncReceipt, SyncStorage, SyncSummary } from './types';

/** Stable comparison, without trusting device clocks or insertion order of JSON keys. */
export function canonical(value: any): string {
    if (value === undefined) return 'null';
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (value instanceof Date) return JSON.stringify(value.toISOString());
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort()
        .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}
const clone = <T>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value));
export const baseKey = (kind: SyncKind, entityId: string) => `${kind}:${entityId}`;
const queues = new Map<string, Promise<any>>();
export const mediaKind = (kind: SyncKind) => kind === 'PHOTO' || kind === 'AUDIO' || kind === 'VIDEO';
export const archivedMedia = (entry: SyncEntry, entries: SyncEntry[]) => mediaKind(entry.operation.kind) &&
    entry.receipt.durable === true && entry.receipt.error?.code === 'MOBILE_REMOVED_IN_VISIT' &&
    entries.some((deletion) => ['PHOTO_DELETE', 'FILE_DELETE'].includes(deletion.operation.kind) &&
        deletion.operation.entityId === entry.operation.entityId && deletion.receipt.state === 'APPLIED');
export class SyncJournal {
    readonly key: string;
    constructor(readonly storage: SyncStorage, readonly context: SyncContext,
        readonly options: { id: () => string; now: () => string }) {
        for (const part of [context.userId, context.companyId, context.workspaceId, context.deviceId]) {
            if (!/^[a-zA-Z0-9_-]+$/.test(String(part))) throw new Error('Contexto inválido para sincronização.');
        }
        this.key = `mobile-sync-v1:${context.userId}:${context.companyId}:${context.workspaceId}`;
    }
    private async load(): Promise<SyncDocument> {
        const raw = await this.storage.getItem(this.key);
        if (!raw) return { version: 1, context: clone(this.context), entries: [], bases: {} };
        const doc = JSON.parse(raw) as SyncDocument;
        if (doc.version !== 1 || !Array.isArray(doc.entries) || !doc.bases ||
            doc.context.userId !== this.context.userId || doc.context.companyId !== this.context.companyId ||
            doc.context.workspaceId !== this.context.workspaceId || doc.context.deviceId !== this.context.deviceId) {
            throw new Error('Diário de sincronização inválido. Os dados foram preservados; exporte a cópia de segurança.');
        }
        return doc;
    }
    private async mutate<T>(fn: (doc: SyncDocument) => T | Promise<T>): Promise<T> {
        const prior = queues.get(this.key) || Promise.resolve();
        const next = prior.catch(() => undefined).then(async () => {
            const doc = await this.load();
            const result = await fn(doc);
            // The storage commits its row delta atomically, including payloads and metadata.
            await this.storage.setItem(this.key, JSON.stringify(doc));
            return clone(result);
        });
        queues.set(this.key, next);
        try { return await next; } finally { if (queues.get(this.key) === next) queues.delete(this.key); }
    }
    async read(): Promise<SyncDocument> {
        await (queues.get(this.key) || Promise.resolve()).catch(() => undefined);
        return clone(await this.load());
    }
    async capture(drafts: SyncDraft[]): Promise<SyncEntry[]> {
        return this.mutate((doc) => drafts.map((draft) => {
            const normalized = clone(draft);
            const fingerprint = canonical(normalized);
            // Identical repeated taps/restarts reuse the exact operation id and immutable payload.
            const previous = [...doc.entries].reverse().find((entry) => entry.operation.kind === draft.kind &&
                entry.operation.entityId === draft.entityId);
            if (previous?.fingerprint === fingerprint) return previous;
            // A planner refresh must not erase a decision already confirmed for
            // these exact values. A later edit receives a new operation instead.
            const pendingDependencies = (ids?: string[]) => Array.from(new Set((ids || []).filter((id) =>
                !doc.entries.some((entry) => entry.operation.operationId === id && entry.receipt.state === 'APPLIED')))).sort();
            if (!draft.decision && previous?.operation.decision && previous.receipt.state !== 'APPLIED' &&
                canonical(previous.operation.payload) === canonical(normalized.payload) &&
                previous.operation.baseSnapshotHash === normalized.baseSnapshotHash &&
                canonical(pendingDependencies(previous.operation.dependsOn)) === canonical(pendingDependencies(normalized.dependsOn))) return previous;
            const operation: SyncOperation = { ...normalized, operationId: this.options.id() };
            if (previous && !['APPLIED'].includes(previous.receipt.state) && !operation.supersedesOperationId) {
                operation.supersedesOperationId = previous.operation.operationId;
            }
            const entry: SyncEntry = { operation, fingerprint, capturedAt: this.options.now(), attempts: 0,
                sequence: Math.max(0, ...doc.entries.map((item) => item.sequence || 0)) + 1,
                receipt: { operationId: operation.operationId, kind: operation.kind, entityId: operation.entityId,
                    state: 'PENDING', retryable: true } };
            doc.entries.push(entry);
            return entry;
        }));
    }
    async attempted(operationId: string): Promise<void> {
        await this.mutate((doc) => {
            const entry = doc.entries.find((item) => item.operation.operationId === operationId);
            if (!entry) throw new Error('Operação não está preservada no diário.');
            entry.attempts += 1; entry.lastAttemptAt = this.options.now();
        });
    }
    async updateReceipt(receipt: SyncReceipt): Promise<void> {
        return this.updateReceipts([receipt]);
    }
    async updateReceipts(receipts: SyncReceipt[]): Promise<void> {
        await this.mutate((doc) => receipts.forEach((receipt) => {
            const entry = doc.entries.find((item) => item.operation.operationId === receipt.operationId);
            if (!entry || entry.operation.kind !== receipt.kind || entry.operation.entityId !== receipt.entityId ||
                !['RECEIVED', 'APPLIED', 'NEEDS_REVIEW', 'WAITING_DEPENDENCY', 'RETRY'].includes(receipt.state)) {
                throw new Error('Confirmação de sincronização inválida. A operação continua no aparelho.');
            }
            if (entry.receipt.state === 'APPLIED' && receipt.state !== 'APPLIED') return;
            entry.receipt = clone(receipt);
            const snapshot = receipt.snapshot || receipt.result?.snapshot;
            const hash = receipt.baseSnapshotHash || receipt.result?.baseSnapshotHash;
            if (receipt.state === 'APPLIED' && hash && snapshot) {
                const key = baseKey(entry.operation.kind, entry.operation.entityId);
                const old = doc.bases[key];
                doc.bases[key] = { baseSnapshotHash: hash, snapshot: clone(snapshot),
                    localSnapshot: { ...(old?.localSnapshot || old?.snapshot || {}), ...clone(entry.operation.payload) } };
            }
        }));
    }
    async fail(operationId: string, error: any): Promise<void> {
        await this.mutate((doc) => {
            const entry = doc.entries.find((item) => item.operation.operationId === operationId);
            if (!entry || entry.receipt.state === 'APPLIED') return;
            const message = error?.message || 'Não foi possível confirmar o recebimento. Tente sincronizar novamente.';
            entry.receipt = { ...entry.receipt, state: entry.receipt.receivedAt ? entry.receipt.state : 'RETRY',
                retryable: true, error: { code: error?.code || 'CONNECTION_FAILED', message } };
        });
    }
    async setBase(kind: SyncKind, entityId: string, base: SyncBase): Promise<void> {
        await this.mutate((doc) => { doc.bases[baseKey(kind, entityId)] = clone(base); });
    }
    async getSetting<T>(key: string): Promise<T | undefined> { return clone((await this.read()).settings?.[key]); }
    async setSetting(key: string, value: any): Promise<void> {
        await this.updateSetting(key, () => value);
    }
    async updateSetting<T>(key: string, update: (previous: T | undefined) => T | undefined): Promise<void> {
        if (!/^[a-zA-Z0-9_-]{1,80}$/.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Configuração de coleta inválida.');
        await this.mutate((doc) => {
            doc.settings ||= {};
            const value = update(clone(doc.settings[key]));
            if (value === undefined) delete doc.settings[key]; else doc.settings[key] = clone(value);
        });
    }
    /** Import the exact IDs/content returned by a sealed decision plan. */
    async importOperations(operations: SyncOperation[]): Promise<SyncEntry[]> {
        return this.mutate((doc) => operations.map((operation) => {
            if (!/^[a-f0-9-]{36}$/i.test(operation.operationId)) throw new Error('Identificador de decisão inválido.');
            const old = doc.entries.find((entry) => entry.operation.operationId === operation.operationId);
            if (old) {
                if (canonical(old.operation) !== canonical(operation)) throw new Error('A operação já tem outro conteúdo. A coleta anterior foi preservada.');
                return old;
            }
            const { operationId, ...draft } = operation;
            const entry: SyncEntry = { operation: clone(operation), fingerprint: canonical(draft),
                sequence: Math.max(0, ...doc.entries.map((item) => item.sequence || 0)) + 1,
                capturedAt: this.options.now(), attempts: 0,
                receipt: { operationId, kind: operation.kind, entityId: operation.entityId, state: 'PENDING', retryable: true } };
            doc.entries.push(entry);
            return entry;
        }));
    }
    async summary(): Promise<SyncSummary> {
        const doc = await this.read();
        const latest = new Map<string, SyncEntry>();
        doc.entries.forEach((entry) => latest.set(baseKey(entry.operation.kind, entry.operation.entityId), entry));
        const entries = Array.from(latest.values());
        const received = (entry: SyncEntry) => mediaKind(entry.operation.kind) ? entry.receipt.durable === true : !!entry.receipt.receivedAt;
        return { total: entries.length, applied: entries.filter((e) => e.receipt.state === 'APPLIED').length,
            received: entries.filter((e) => received(e) && e.receipt.state !== 'APPLIED').length,
            review: entries.filter((e) => e.receipt.state === 'NEEDS_REVIEW' && !archivedMedia(e, entries)).length,
            pending: entries.filter((e) => !received(e) && e.receipt.state !== 'APPLIED').length,
            mediaPending: entries.filter((e) => mediaKind(e.operation.kind) && e.receipt.state !== 'APPLIED' && !archivedMedia(e, entries)).length };
    }
    /** Includes every original payload and receipt. Never includes session tokens. */
    async export(): Promise<string> { return JSON.stringify(await this.read(), null, 2); }
}
