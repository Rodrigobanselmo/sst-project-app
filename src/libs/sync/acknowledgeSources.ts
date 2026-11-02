import { database } from '@libs/watermelon';
import { Q } from '@nozbe/watermelondb';
import { baseKey, SyncJournal } from './journal';
import { SyncEntry } from './types';

/** Keep stable local IDs/relations; only advance the API alias after a durable application receipt. */
export async function acknowledgeSourceIds(journal: SyncJournal) {
    const tables: Record<string, string> = { RISK_DATA: 'RiskData', CHARACTERIZATION: 'CompanyCharacterization', REC_MED: 'RecMed', GENERATE_SOURCE: 'GenerateSource' };
    const latest = new Map<string, SyncEntry>();
    for (const entry of (await journal.read()).entries) if (entry.receipt.state === 'APPLIED' && tables[entry.operation.kind]) latest.set(baseKey(entry.operation.kind, entry.operation.entityId), entry);
    if (!latest.size) return;
    await database.write(async () => {
        const changes: any[] = [];
        for (const entry of Array.from(latest.values())) {
            const id = entry.receipt.result?.mobileSync?.snapshot?.id || entry.receipt.result?.id;
            if (typeof id !== 'string' || !id) continue;
            const rows: any[] = await database.get(tables[entry.operation.kind]).query(Q.where('id', entry.operation.entityId), Q.where('user_id', String(journal.context.userId))).fetch();
            const row = rows[0];
            if (row && row.apiId !== id) changes.push(row.prepareUpdate((current: any) => { current.apiId = id; }));
        }
        if (changes.length) await database.batch(...changes);
    });
}
