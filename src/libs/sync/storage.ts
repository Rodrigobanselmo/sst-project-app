import { database } from '@libs/watermelon';
import { SyncOperationModel } from '@libs/watermelon/model/SyncOperationModel';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid';
import { canonical, SyncJournal } from './journal';
import { SyncContext, SyncDraft, SyncEntry } from './types';

export { createWatermelonSyncStorage } from './watermelonStorage';
import { createWatermelonSyncStorage } from './watermelonStorage';
export const syncStorage = createWatermelonSyncStorage(database);

let deviceIdPromise: Promise<string> | undefined;
export async function getDeviceId(): Promise<string> {
    if (!deviceIdPromise) deviceIdPromise = (async () => {
        const key = 'mobile-sync-device-v1';
        const value = await database.localStorage.get<string>(key);
        if (value) return value;
        const id = String(uuid.v4()); await database.localStorage.set(key, id); return id;
    })().catch((error) => { deviceIdPromise = undefined; throw error; });
    return deviceIdPromise;
}
export async function createSyncJournal(context: Omit<SyncContext, 'deviceId'>): Promise<SyncJournal> {
    return new SyncJournal(syncStorage, { ...context, deviceId: await getDeviceId() },
        { id: () => String(uuid.v4()), now: () => new Date().toISOString() });
}

/** Call only inside the same database.write that hides the deleted source. */
export async function prepareDeletion(journal: SyncJournal, draft: SyncDraft, pendingCount = 0): Promise<SyncOperationModel[]> {
    const collection = database.get<SyncOperationModel>('SyncOperation');
    const rows = await collection.query(Q.where('context_key', journal.key)).fetch();
    const prior = rows.filter((r) => r.recordType === 'OPERATION').map((r) => JSON.parse(r.data) as SyncEntry)
        .find((e) => e.operation.kind === draft.kind && e.operation.entityId === draft.entityId && e.fingerprint === canonical(draft));
    if (prior) return [];
    const id = String(uuid.v4());
    const entry: SyncEntry = { operation: { ...draft, operationId: id }, fingerprint: canonical(draft),
        sequence: Math.max(0, ...rows.filter((r) => r.recordType === 'OPERATION').map((r) => (JSON.parse(r.data) as SyncEntry).sequence || 0)) + pendingCount + 1,
        capturedAt: new Date().toISOString(), attempts: 0,
        receipt: { operationId: id, kind: draft.kind, entityId: draft.entityId, state: 'PENDING', retryable: true } };
    const prepared = [collection.prepareCreate((row) => {
        row._raw.id = id; row.contextKey = journal.key; row.recordType = 'OPERATION'; row.entityKey = id;
        row.data = JSON.stringify(entry);
    })];
    if (!pendingCount && !rows.some((r) => r.recordType === 'META')) prepared.push(collection.prepareCreate((row) => {
        row._raw.id = String(uuid.v4()); row.contextKey = journal.key; row.recordType = 'META'; row.entityKey = 'context';
        row.data = JSON.stringify(journal.context);
    }));
    return prepared;
}
