import { DBTablesEnum } from '@constants/enums/db-tables';
import { addColumns, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import { migration42 } from './versions/migration_42';

export const migrations = schemaMigrations({
    migrations: [migration42],
});
