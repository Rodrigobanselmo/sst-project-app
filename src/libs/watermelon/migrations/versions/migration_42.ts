import { DBTablesEnum } from '@constants/enums/db-tables';
import { addColumns, Migration, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migration42: Migration = {
    toVersion: 42,
    steps: [
        addColumns({
            table: DBTablesEnum.RISK_DATA,
            columns: [
                { name: 'exposure', type: 'string', isOptional: true },
                { name: 'activities', type: 'string', isOptional: true },
            ],
        }),
        addColumns({
            table: DBTablesEnum.RISK,
            columns: [{ name: 'activities', type: 'string', isOptional: true }],
        }),
    ],
};
