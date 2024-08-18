import { DBTablesEnum } from '@constants/enums/db-tables';
import { addColumns, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import { migration45 } from './versions/migration_45';

export const migrations = schemaMigrations({
    migrations: [migration45],
});
