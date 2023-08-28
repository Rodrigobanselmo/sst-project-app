import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const recsRiskDataSchema = tableSchema({
    name: DBTablesEnum.MM_RECS_TO_RISK_DATA,
    columns: [
        { name: 'recMedId', type: 'string' },
        { name: 'riskDataId', type: 'string' },
        { name: 'efficientlyCheck', type: 'boolean', isOptional: true },
        { name: 'user_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
    ],
});

export { recsRiskDataSchema };
