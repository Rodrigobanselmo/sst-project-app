import { DBTablesEnum } from '@constants/enums/db-tables';
import { addColumns, Migration, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migration45: Migration = {
    toVersion: 45,
    steps: [
        addColumns({
            table: DBTablesEnum.COMPANY_CHARACTERIZATION,
            columns: [{ name: 'doneAt', type: 'number', isOptional: true }],
        }),
    ],
};
