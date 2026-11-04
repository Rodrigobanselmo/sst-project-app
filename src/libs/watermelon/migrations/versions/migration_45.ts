import { createTable, Migration } from '@nozbe/watermelondb/Schema/migrations';
import { syncOperationSchema } from '../../schema/syncOperationSchema';

export const migration45: Migration = {
    toVersion: 45,
    steps: [
        createTable({ name: syncOperationSchema.name, columns: Object.values(syncOperationSchema.columns) }),
    ],
};
