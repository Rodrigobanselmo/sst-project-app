import type { SyncDatabaseChangeSet } from '@nozbe/watermelondb/sync';

const tables = new Set(['Risk', 'RecMed', 'GenerateSource', 'Employee', 'Hierarchy', 'Workspace', 'Company', 'MMWorkspaceHierarchy']);
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const fail = (code: string, message = 'O catálogo recebido é inválido. As coletas locais foram preservadas.'): never => {
    throw Object.assign(new Error(message), { code });
};
const object = (value: any) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** Full company refreshes deliberately replay records already saved by login.
 * Watermelon's supported upsert mode takes every live row as `updated`, keeps
 * local changed columns and never resurrects a local deletion. Validation stays
 * strict: conflicting IDs, internal sync fields and another actor are errors.
 */
export function catalogChangesForUpsert(changes: unknown, actorId: number): SyncDatabaseChangeSet {
    if (!Number.isSafeInteger(actorId) || actorId < 1 || !object(changes)) fail('MOBILE_CATALOG_INVALID');
    return Object.fromEntries(Object.entries(changes as Record<string, any>).map(([table, group]) => {
        if (!tables.has(table) || !object(group) || !['created', 'updated', 'deleted'].every((key) => Array.isArray(group[key])))
            fail('MOBILE_CATALOG_INVALID');
        const seen = new Set<string>();
        const remember = (id: any) => {
            // The API's Employee primary key is a positive integer; Watermelon
            // identities are strings. Keep that API identity stable on replay
            // and deletion, and detect collisions after this explicit adapter.
            if (table === 'Employee' && typeof id === 'number') {
                if (!Number.isSafeInteger(id) || id < 1) fail('MOBILE_CATALOG_INVALID');
                id = String(id);
            }
            if (typeof id !== 'string' || !id.length) fail('MOBILE_CATALOG_INVALID');
            if (seen.has(id)) fail('MOBILE_CATALOG_DUPLICATE_ID');
            seen.add(id);
            return id;
        };
        const updated = [...group.created, ...group.updated].map((record: any) => {
            if (!object(record) || !own(record, 'id') || '_status' in record || '_changed' in record || own(record, '__proto__'))
                fail('MOBILE_CATALOG_INVALID');
            const id = remember(record.id);
            if (table !== 'MMWorkspaceHierarchy' && record.user_id !== String(actorId))
                fail('MOBILE_CATALOG_ACTOR_MISMATCH', 'O catálogo recebido pertence a outro usuário. As coletas locais foram preservadas.');
            if (table === 'Employee' && typeof record.id === 'number') {
                if (record.apiId !== undefined && record.apiId !== record.id) fail('MOBILE_CATALOG_INVALID');
                return { ...record, id, apiId: record.id };
            }
            return { ...record, id };
        });
        const deleted = group.deleted.map(remember);
        return [table, { created: [], updated, deleted }];
    }));
}
