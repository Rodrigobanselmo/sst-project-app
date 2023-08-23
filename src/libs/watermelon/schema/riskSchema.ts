import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const riskSchema = tableSchema({
    name: DBTablesEnum.RISK,
    columns: [
        { name: 'apiId', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'severity', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'user_id', type: 'string' },
        { name: 'companyId', type: 'string', isOptional: true },
        { name: 'representAll', type: 'boolean', isOptional: true },
        { name: 'cas', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
    ],
});

export { riskSchema };
