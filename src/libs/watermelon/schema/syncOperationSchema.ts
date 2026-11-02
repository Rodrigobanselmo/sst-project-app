import { tableSchema } from '@nozbe/watermelondb';
export const syncOperationSchema = tableSchema({ name: 'SyncOperation', columns: [
    { name: 'context_key', type: 'string', isIndexed: true },
    { name: 'record_type', type: 'string', isIndexed: true },
    { name: 'entity_key', type: 'string', isIndexed: true },
    { name: 'data', type: 'string' },
] });
