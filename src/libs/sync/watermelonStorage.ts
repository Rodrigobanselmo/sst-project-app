import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { SyncOperationModel } from '../watermelon/model/SyncOperationModel';
import uuid from 'react-native-uuid';
import { SyncDocument, SyncStorage } from './types';

/** The core's document interface is persisted as separate SQLite rows in one Watermelon batch. */
export function createWatermelonSyncStorage(database: Database): SyncStorage { return {
    async getItem(key) {
        const rows = await database.get<SyncOperationModel>('SyncOperation').query(Q.where('context_key', key),
            Q.where('record_type', Q.oneOf(['META', 'OPERATION', 'BASE', 'SETTINGS']))).fetch();
        if (!rows.length) return null;
        const meta = rows.find((r) => r.recordType === 'META');
        if (!meta) throw new Error('Não foi possível ler a identidade desta coleta. Os dados permanecem no aparelho.');
        const doc: SyncDocument = { version: 1, context: JSON.parse(meta.data), bases: {}, entries: [] };
        for (const row of rows) {
            if (row.recordType === 'OPERATION') doc.entries.push(JSON.parse(row.data));
            if (row.recordType === 'BASE') doc.bases[row.entityKey] = JSON.parse(row.data);
            if (row.recordType === 'SETTINGS') doc.settings = JSON.parse(row.data);
        }
        // Capture order is stable, even after a native process restart.
        doc.entries.sort((a, b) => (a.sequence || 0) - (b.sequence || 0) || a.capturedAt.localeCompare(b.capturedAt));
        return JSON.stringify(doc);
    },
    async setItem(key, value) {
        const doc = JSON.parse(value) as SyncDocument;
        await database.write(async () => {
            const collection = database.get<SyncOperationModel>('SyncOperation');
            const rows = await collection.query(Q.where('context_key', key)).fetch();
            const values = [
                { type: 'META', entity: 'context', data: JSON.stringify(doc.context), id: undefined },
                ...(doc.settings ? [{ type: 'SETTINGS', entity: 'settings', data: JSON.stringify(doc.settings), id: undefined }] : []),
                ...doc.entries.map((entry) => ({ type: 'OPERATION', entity: entry.operation.operationId,
                    data: JSON.stringify(entry), id: entry.operation.operationId })),
                ...Object.entries(doc.bases).map(([entity, base]) => ({ type: 'BASE', entity,
                    data: JSON.stringify(base), id: undefined })),
            ];
            const prepared = values.flatMap((value) => {
                const existing = rows.find((row) => row.recordType === value.type && row.entityKey === value.entity);
                if (existing?.data === value.data) return [];
                if (existing) return [existing.prepareUpdate((row) => { row.data = value.data; })];
                return [collection.prepareCreate((row) => {
                    row._raw.id = value.id || String(uuid.v4()); row.contextKey = key;
                    row.recordType = value.type; row.entityKey = value.entity; row.data = value.data;
                })];
            });
            if (prepared.length) await database.batch(...prepared);
            // Never delete rows absent from an older in-memory view: a concurrent local tombstone may have arrived.
        });
    },
}; }
