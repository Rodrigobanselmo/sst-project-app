import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const riskDataSchema = tableSchema({
    name: DBTablesEnum.RISK_DATA,
    columns: [
        { name: 'apiId', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'riskId', type: 'string' },
        { name: 'probability', type: 'string', isOptional: true },
        { name: 'probabilityAfter', type: 'number', isOptional: true },
        { name: 'characterizationId', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
    ],
});

export { riskDataSchema };
