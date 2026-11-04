import { Directory, File, Paths } from 'expo-file-system/next';
import * as FileSystem from 'expo-file-system/legacy';
import { sha256 } from '@noble/hashes/sha256';
import { strToU8 } from 'fflate';
import { Q } from '@nozbe/watermelondb';
import { database } from '@libs/watermelon';
import { api } from '@services/api';
import { storageUserGet } from '@libs/storage/disk/user';
import { storageAuthTokenGet } from '@libs/storage/disk/token';
import { SyncJournal } from './journal';
import { collectRawVisit } from './rawVisit';
import { recoverVisit, RecoveryClient, RecoveryIO, RecoveryOptions, recoverySummary } from './recovery';
import { createWatermelonRecoveryStore } from './recoveryStorage';

/** Streaming file hash; only 64 KiB of binary data is held in JavaScript at a time. */
export async function inspectRecoveryFile(uri: string) {
    const file = new File(uri);
    if (!file.exists) return { exists: false, size: 0, sha256: '' };
    const size = file.size, hash = sha256.create(), handle = file.open();
    try {
        let read = 0, chunks = 0;
        while (read < size) {
            const bytes = handle.readBytes(Math.min(64 * 1024, size - read));
            if (!bytes.length || bytes.length > size - read) throw new Error('A leitura do arquivo foi interrompida.');
            hash.update(bytes); read += bytes.length;
            if (++chunks % 32 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
        if (file.size !== size) throw new Error('O arquivo mudou durante a leitura.');
        return { exists: true, size, sha256: Array.from(hash.digest()).map((byte) => byte.toString(16).padStart(2, '0')).join('') };
    } finally { handle.close(); hash.destroy(); }
}
function* jsonPieces(value: any): Generator<string> {
    if (value === null || typeof value !== 'object') { yield JSON.stringify(value) ?? 'null'; return; }
    if (Array.isArray(value)) {
        yield '['; for (let i = 0; i < value.length; i++) {
            if (i) yield ','; const child = jsonPieces(value[i]); let next = child.next();
            while (!next.done) { yield next.value; next = child.next(); }
        } yield ']'; return;
    }
    yield '{'; let comma = false;
    for (const [key, child] of Object.entries(value)) {
        if (child === undefined) continue; if (comma) yield ','; comma = true;
        yield JSON.stringify(key) + ':'; const iterator = jsonPieces(child); let next = iterator.next();
        while (!next.done) { yield next.value; next = iterator.next(); }
    }
    yield '}';
}
async function writeRawJson(file: File, document: any) {
    file.create({ overwrite: false });
    const handle = file.open();
    try {
        let buffer = '', turns = 0;
        const pieces = jsonPieces(document); let next = pieces.next();
        while (!next.done) {
            buffer += next.value;
            if (buffer.length >= 64 * 1024) { handle.writeBytes(strToU8(buffer)); buffer = ''; if (++turns % 8 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
            next = pieces.next();
        }
        if (buffer) handle.writeBytes(strToU8(buffer));
    } finally { handle.close(); }
}
function nativeDependencies(journal: SyncJournal) {
    const context = journal.context;
    const store = createWatermelonRecoveryStore(database, journal.key, journal.options.id);
    const path = `/companies/${context.companyId}/mobile-recovery/packages`;
    const scope = { deviceId: context.deviceId, workspaceId: context.workspaceId };
    const assertActor = async () => {
        if (Number((await storageUserGet())?.id) !== context.userId) throw Object.assign(new Error('Entre com o usuário desta visita para continuar. A cópia permanece no aparelho.'), { code: 'AUTH_SESSION_CHANGED', status: 401 });
    };
    const headers = async () => {
        await assertActor(); const token = await storageAuthTokenGet(); await assertActor();
        if (!token?.token) throw Object.assign(new Error('Entre novamente para enviar esta cópia. Os dados permanecem no aparelho.'), { code: 'AUTH_EXPIRED', status: 401 });
        return { Authorization: `Bearer ${token.token}` };
    };
    const post = async (suffix: string, body: any) => (await api.post(path + suffix, body, { headers: await headers(), timeout: 30000 })).data;
    const client: RecoveryClient = {
        create: (request) => post('', request),
        get: async (id) => (await api.get(`${path}/${id}`, { params: scope, headers: await headers(), timeout: 30000 })).data,
        sign: (id, assetId) => post(`/${id}/assets/${assetId}/upload`, scope),
        confirm: (id, assetId) => post(`/${id}/assets/${assetId}/confirm`, scope),
        complete: (id) => post(`/${id}/complete`, scope),
    };
    const io: RecoveryIO = {
        async prepare(recoveryId) {
            await assertActor();
            const capturedAt = journal.options.now();
            const raw = await database.read(async () => collectRawVisit(context, async (table) => {
                const conditions = table === 'SyncOperation' ? [Q.where('context_key', journal.key)] :
                    ['Company', 'Workspace', 'CompanyCharacterization', 'RiskData', 'Risk', 'RecMed', 'GenerateSource', 'Hierarchy', 'Employee', 'MMGenerateToRiskData', 'MMEngsToRiskData', 'MMAdmsToRiskData', 'MMRecsToRiskData', 'MMEpisToRiskData'].includes(table) ? [Q.where('user_id', String(context.userId))] : [];
                const rows: any[] = await database.get(table).query(...conditions).fetch();
                return rows.map((row) => ({ ...row._raw }));
            }, capturedAt));
            const directory = new Directory(Paths.document, 'visit-recovery', recoveryId);
            directory.create({ intermediates: true, idempotent: true });
            const file = new File(directory, 'coleta.json');
            await writeRawJson(file, raw.document); await assertActor();
            return { rawUri: file.uri, media: raw.media, missingData: raw.readErrors.map((error) => error.table),
                diagnostics: { capturedAt, schemaVersion: 45, tables: Object.fromEntries(Object.entries(raw.document.tables).map(([name, rows]) => [name, (rows as any[]).length])), readErrors: raw.readErrors } };
        },
        inspect: inspectRecoveryFile,
        async upload(url, uri, signedHeaders, onProgress) {
            await assertActor();
            if (!/^https:\/\//i.test(url) || Object.keys(signedHeaders).some((key) => !['content-type', 'x-amz-checksum-sha256'].includes(key.toLowerCase()))) throw new Error('A autorização temporária de envio é inválida.');
            let changed = false;
            const task = FileSystem.createUploadTask(url, uri, { httpMethod: 'PUT', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                headers: signedHeaders, sessionType: FileSystem.FileSystemSessionType.FOREGROUND }, (progress) => onProgress(progress.totalBytesSent));
            // A change of account cancels the native upload, including long videos.
            const timer = setInterval(() => { void assertActor().catch(() => { changed = true; void task.cancelAsync().catch(() => undefined); }); }, 1500);
            try {
                const response = await task.uploadAsync();
                if (changed) await assertActor();
                if (!response || response.status < 200 || response.status >= 300) throw new Error('O arquivo não foi confirmado pelo armazenamento. Tente novamente; os demais itens continuam preservados.');
                await assertActor();
            } finally { clearInterval(timer); }
        },
    };
    return { store, io, client, id: journal.options.id, now: journal.options.now };
}
export async function uploadVisitRecovery(journal: SyncJournal, options: RecoveryOptions) {
    return recoverVisit(journal.context, nativeDependencies(journal), options);
}
export async function loadVisitRecovery(journal: SyncJournal) {
    const state = await createWatermelonRecoveryStore(database, journal.key, journal.options.id).get();
    return state && recoverySummary(state);
}
