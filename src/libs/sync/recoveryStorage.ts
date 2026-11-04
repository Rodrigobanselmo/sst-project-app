import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { RecoveryState, RecoveryStore } from './recovery';

/** Rescue metadata does not depend on parsing a potentially broken sync journal. Old packages stay preserved. */
export function createWatermelonRecoveryStore(database: Database, contextKey: string, id: () => string): RecoveryStore {
    return {
        async get() {
            const collection = database.get<any>('SyncOperation');
            const pointers = await collection.query(Q.where('context_key', contextKey), Q.where('record_type', 'RECOVERY_ACTIVE')).fetch();
            if (!pointers.length) return undefined;
            const recoveryId = JSON.parse(pointers[0].data).recoveryId;
            const rows = await collection.query(Q.where('context_key', contextKey), Q.where('record_type', 'RECOVERY'), Q.where('entity_key', recoveryId)).fetch();
            if (rows.length !== 1) throw new Error('A referência da cópia anterior não pôde ser lida. Prepare outra cópia; os dados originais continuam no aparelho.');
            return JSON.parse(rows[0].data) as RecoveryState;
        },
        async set(state) {
            await database.write(async () => {
                const collection = database.get<any>('SyncOperation');
                const rows = await collection.query(Q.where('context_key', contextKey), Q.where('record_type', Q.oneOf(['RECOVERY', 'RECOVERY_ACTIVE']))).fetch();
                const values = [{ type: 'RECOVERY', entity: state.request.recoveryId, data: JSON.stringify(state) },
                    { type: 'RECOVERY_ACTIVE', entity: 'active', data: JSON.stringify({ recoveryId: state.request.recoveryId }) }];
                const writes = values.flatMap((value) => {
                    const old = rows.find((row: any) => row.recordType === value.type && row.entityKey === value.entity);
                    if (old?.data === value.data) return [];
                    if (old) return [old.prepareUpdate((row: any) => { row.data = value.data; })];
                    return [collection.prepareCreate((row: any) => { row._raw.id = id(); row.contextKey = contextKey; row.recordType = value.type; row.entityKey = value.entity; row.data = value.data; })];
                });
                if (writes.length) await database.batch(...writes);
            });
        },
    };
}
