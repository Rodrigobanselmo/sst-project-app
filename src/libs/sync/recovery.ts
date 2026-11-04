import { canonical } from './journal';
import { SyncContext } from './types';

export type RecoveryKind = 'RAW_JSON' | 'PHOTO' | 'AUDIO' | 'VIDEO' | 'OTHER';
export interface RecoveryAsset { assetId: string; kind: RecoveryKind; name: string; mimeType: string; size: number; sha256: string }
export interface RecoveryManifest { format: 'simplesst.visit.raw'; version: 1; rawAssetId: string; assets: RecoveryAsset[]; diagnostics?: any }
export interface RecoveryCreate { contractVersion: 1; recoveryId: string; deviceId: string; workspaceId: string; reasonCode: 'SYNC_FAILURE' | 'MANUAL_RESCUE'; manifest: RecoveryManifest }
export interface RecoveryRemote {
    recoveryId: string; state: 'RECEIVED' | 'COMPLETE'; manifest: RecoveryManifest; completedAt?: string;
    assets: { assetId: string; state: 'PENDING' | 'VERIFIED'; size: number; sha256: string }[];
}
export interface RecoveryProgress {
    recoveryId?: string; phase: 'PREPARING' | 'UPLOADING' | 'VERIFYING' | 'COMPLETE';
    completedFiles: number; totalFiles: number; uploadedBytes: number; totalBytes: number;
}
export interface RecoveryState {
    version: 1; context: SyncContext; request: RecoveryCreate; preparedAt: string; complete: boolean; receivedAt?: string;
    sources: Record<string, string>; verified: string[]; missingFiles: string[]; failures: Record<string, string>;
}
export interface RecoveryStore { get(): Promise<RecoveryState | undefined>; set(state: RecoveryState): Promise<void> }
export interface RecoveryIO {
    prepare(recoveryId: string): Promise<{ rawUri: string; media: { uri: string; name: string; kind: RecoveryKind; mimeType: string }[]; diagnostics?: any; missingData?: string[] }>;
    inspect(uri: string): Promise<{ exists: boolean; size: number; sha256: string }>;
    upload(url: string, uri: string, headers: Record<string, string>, onProgress: (bytes: number) => void): Promise<void>;
}
export interface RecoveryClient {
    create(request: RecoveryCreate): Promise<RecoveryRemote>;
    get(recoveryId: string): Promise<RecoveryRemote>;
    sign(recoveryId: string, assetId: string): Promise<{ assetId: string; state?: string; url?: string; method?: string; headers?: Record<string, string> }>;
    confirm(recoveryId: string, assetId: string): Promise<{ assetId: string; state: string }>;
    complete(recoveryId: string): Promise<RecoveryRemote>;
}
export interface RecoveryDependencies { store: RecoveryStore; io: RecoveryIO; client: RecoveryClient; id(): string; now(): string }
export interface RecoveryOptions { reasonCode: RecoveryCreate['reasonCode']; details?: string; newPackage?: boolean; onProgress?(progress: RecoveryProgress): void }

/** Domain data stays intact. Authentication material and temporary URLs never enter rescue files. */
export function sanitizeRecovery(value: any, key = ''): any {
    if (/^(?:password|senha|secret|accessToken|refreshToken|token|authorization|cookie|privateKey|private_key|pfx|certificatePassword)$/i.test(key)) return '[redacted]';
    if (typeof value === 'string') {
        if (['data', 'audios', 'videos'].includes(key)) {
            try { return JSON.stringify(sanitizeRecovery(JSON.parse(value))); } catch { /* retain malformed source in a safe representation */ }
        }
        return value.replace(/Bearer\s+\S+/gi, '[token redacted]')
            .replace(/"(?:password|senha|secret|accessToken|refreshToken|token|authorization|cookie|privateKey|pfx)"\s*:\s*"(?:[^"\\]|\\.)*"/gi, '"sensitiveValue":"[redacted]"')
            .replace(/https?:\/\/[^\s"<>]+/gi, (url) => url.split(/[?#]/)[0]);
    }
    if (Array.isArray(value)) return value.map((item) => sanitizeRecovery(item));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([child, item]) => [child, sanitizeRecovery(item, child)]));
    return value;
}
const safeMessage = (error: any) => String(sanitizeRecovery(error?.message || 'Não foi possível confirmar este arquivo. Tente novamente.')).slice(0, 800);
const authFailure = (error: any) => error?.status === 401 || error?.response?.status === 401 || ['AUTH_SESSION_CHANGED', 'AUTH_EXPIRED'].includes(error?.code);
const progress = (options: RecoveryOptions, value: RecoveryProgress) => { try { options.onProgress?.(value); } catch { /* Presentation callbacks cannot interrupt rescue. */ } };
const result = (state: RecoveryState) => ({ recoveryId: state.request.recoveryId, complete: state.complete, receivedAt: state.receivedAt,
    preparedAt: state.preparedAt, fileCount: state.request.manifest.assets.length, missingFiles: state.missingFiles,
    failedFiles: Object.keys(state.failures).length });
export const recoverySummary = result;
const running = new Map<string, Promise<ReturnType<typeof result>>>();

/** Whole-file retries, two uploads at a time. A receipt lost after a PUT never changes the immutable manifest. */
export function recoverVisit(context: SyncContext, deps: RecoveryDependencies, options: RecoveryOptions) {
    const key = canonical(context);
    const active = running.get(key);
    if (active) return active;
    const task = run(context, deps, options);
    running.set(key, task);
    void task.finally(() => { if (running.get(key) === task) running.delete(key); }).catch(() => undefined);
    return task;
}
async function run(context: SyncContext, deps: RecoveryDependencies, options: RecoveryOptions) {
    let state = options.newPackage ? undefined : await deps.store.get();
    if (state && (state.version !== 1 || canonical(state.context) !== canonical(context))) throw new Error('A cópia pertence a outra visita. As fontes continuam preservadas.');
    if (!state || options.newPackage) {
        const recoveryId = deps.id();
        progress(options, { phase: 'PREPARING', completedFiles: 0, totalFiles: 0, uploadedBytes: 0, totalBytes: 0 });
        const prepared = await deps.io.prepare(recoveryId);
        const rawId = deps.id();
        const sources: Record<string, string> = {}, assets: RecoveryAsset[] = [], missingFiles: string[] = (prepared.missingData || []).map((table) => `dados:${table}`);
        const seen = new Set<string>();
        const inputs = [{ uri: prepared.rawUri, name: 'coleta.json', kind: 'RAW_JSON' as const, mimeType: 'application/json' }, ...prepared.media];
        for (const source of inputs) {
            if (seen.has(source.uri)) continue; seen.add(source.uri);
            let info;
            try { info = await deps.io.inspect(source.uri); } catch { info = { exists: false, size: 0, sha256: '' }; }
            if (!info.exists) {
                if (source.kind === 'RAW_JSON') throw new Error('Não foi possível preparar os dados da visita. Nenhum dado original foi apagado.');
                missingFiles.push(source.uri); continue;
            }
            if (!Number.isSafeInteger(info.size) || info.size < 1 || info.size > (source.kind === 'RAW_JSON' ? 512 * 1024 ** 2 : 2 * 1024 ** 3) || !/^[a-f0-9]{64}$/.test(info.sha256)) {
                if (source.kind === 'RAW_JSON') throw new Error('Os dados brutos excedem o limite de recuperação ou não puderam ser verificados. As fontes continuam no aparelho.');
                missingFiles.push(source.uri); continue;
            }
            const assetId = source.kind === 'RAW_JSON' ? rawId : deps.id(); sources[assetId] = source.uri;
            assets.push({ assetId, kind: source.kind, name: source.name.slice(0, 180), mimeType: source.mimeType, size: info.size, sha256: info.sha256 });
        }
        if (assets.length > 10000 || assets.reduce((sum, asset) => sum + asset.size, 0) > 50 * 1024 ** 3) throw new Error('A visita excede os limites deste pacote de recuperação. As fontes foram preservadas.');
        const manifest: RecoveryManifest = { format: 'simplesst.visit.raw', version: 1, rawAssetId: rawId, assets,
            diagnostics: sanitizeRecovery({ ...prepared.diagnostics, details: options.details, missingLocalFiles: missingFiles }) };
        if (canonical(manifest).length > 4 * 1024 ** 2) throw new Error('A lista de arquivos excede o limite da recuperação. As fontes foram preservadas.');
        state = { version: 1, context, request: { contractVersion: 1, recoveryId, deviceId: context.deviceId, workspaceId: context.workspaceId,
            reasonCode: options.reasonCode, manifest }, sources, preparedAt: deps.now(), verified: [], missingFiles, failures: {}, complete: false };
        // The exact ID, source paths and manifest are durable before the first HTTP request.
        await deps.store.set(state);
    }
    const current = state;
    const uploaded = new Map<string, number>();
    if (current.complete) { emit('COMPLETE'); return result(current); }
    let saves: Promise<void> = Promise.resolve();
    const persist = () => {
        const snapshot = JSON.parse(JSON.stringify(current)) as RecoveryState;
        saves = saves.then(() => deps.store.set(snapshot)); return saves;
    };
    function emit(phase: RecoveryProgress['phase']) {
        const assets = current.request.manifest.assets;
        progress(options, { recoveryId: current.request.recoveryId, phase, completedFiles: current.verified.length,
            totalFiles: assets.length + current.missingFiles.length,
            uploadedBytes: assets.reduce((sum, asset) => sum + (current.verified.includes(asset.assetId) ? asset.size : (uploaded?.get(asset.assetId) || 0)), 0),
            totalBytes: assets.reduce((sum, asset) => sum + asset.size, 0) });
    }
    function accept(remote: RecoveryRemote) {
        const expected = current.request.manifest;
        if (remote.recoveryId !== current.request.recoveryId || remote.manifest?.format !== expected.format || remote.manifest?.version !== 1 || remote.manifest?.rawAssetId !== expected.rawAssetId ||
            canonical(remote.manifest?.assets) !== canonical(expected.assets) || !Array.isArray(remote.assets) || remote.assets.length !== expected.assets.length ||
            new Set(remote.assets.map((asset) => asset.assetId)).size !== expected.assets.length) throw new Error('A confirmação recebida não corresponde ao pacote desta visita. As fontes foram preservadas.');
        for (const asset of remote.assets) {
            const original = expected.assets.find((item) => item.assetId === asset.assetId);
            if (!original || asset.sha256 !== original.sha256 || asset.size !== original.size) throw new Error('A verificação de um arquivo divergiu da cópia local.');
        }
        current.verified = remote.assets.filter((asset) => asset.state === 'VERIFIED').map((asset) => asset.assetId);
        if (remote.state === 'COMPLETE' && current.verified.length === expected.assets.length && !current.missingFiles.length) {
            current.complete = true; current.receivedAt = remote.completedAt;
        }
    }
    emit('UPLOADING');
    // create is idempotent and also recovers an acknowledgement lost after creation.
    accept(await deps.client.create(current.request)); await persist();
    if (current.complete) { emit('COMPLETE'); return result(current); }
    let stop: any;
    const queue = current.request.manifest.assets.filter((asset) => !current.verified.includes(asset.assetId));
    const send = async (asset: RecoveryAsset) => {
        try {
            // A prior PUT may have succeeded even when its response was lost.
            try {
                const prior = await deps.client.confirm(current.request.recoveryId, asset.assetId);
                if (prior.assetId !== asset.assetId || prior.state !== 'VERIFIED') throw new Error('A confirmação do arquivo está incompleta.');
            } catch (error: any) {
                if (authFailure(error)) throw error;
                const info = await deps.io.inspect(current.sources[asset.assetId]);
                if (!info.exists || info.size !== asset.size || info.sha256 !== asset.sha256) throw new Error('O arquivo local está ausente ou mudou desde a preparação. Prepare outra cópia se precisar incluir dados novos.');
                const signed = await deps.client.sign(current.request.recoveryId, asset.assetId);
                if (signed.assetId !== asset.assetId) throw new Error('A autorização não corresponde ao arquivo.');
                if (signed.state !== 'VERIFIED') {
                    if (!signed.url || signed.method !== 'PUT' || !signed.headers) throw new Error('A autorização temporária de envio está incompleta.');
                    await deps.io.upload(signed.url, current.sources[asset.assetId], signed.headers, (bytes) => {
                        uploaded.set(asset.assetId, Math.max(0, Math.min(asset.size, bytes))); emit('UPLOADING');
                    });
                }
                const confirmed = await deps.client.confirm(current.request.recoveryId, asset.assetId);
                if (confirmed.assetId !== asset.assetId || confirmed.state !== 'VERIFIED') throw new Error('O servidor ainda não confirmou este arquivo.');
            }
            if (!current.verified.includes(asset.assetId)) current.verified.push(asset.assetId);
            delete current.failures[asset.assetId]; await persist(); emit('UPLOADING');
        } catch (error: any) {
            current.failures[asset.assetId] = safeMessage(error); await persist();
            if (authFailure(error)) stop = error;
        }
    };
    // Raw data is attempted first. Binary failures never prevent unrelated files from being tried.
    const raw = queue.find((asset) => asset.kind === 'RAW_JSON');
    if (raw) await send(raw);
    const media = queue.filter((asset) => asset !== raw);
    await Promise.all(Array.from({ length: Math.min(2, media.length) }, async () => {
        while (media.length && !stop) { const asset = media.shift(); if (asset) await send(asset); }
    }));
    await saves;
    if (stop) throw stop;
    if (current.verified.length === current.request.manifest.assets.length && !current.missingFiles.length) {
        emit('VERIFYING'); accept(await deps.client.complete(current.request.recoveryId));
        if (!current.complete) throw new Error('A recuperação ainda não foi confirmada como completa. O pacote será retomado na próxima tentativa.');
        current.failures = {}; await persist(); emit('COMPLETE');
    }
    return result(current);
}
