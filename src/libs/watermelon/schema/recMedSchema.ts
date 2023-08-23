import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const recMedSchema = tableSchema({
    name: DBTablesEnum.REC_MED,
    columns: [
        { name: 'apiId', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'riskId', type: 'string' },
        { name: 'companyId', type: 'string', isOptional: true },
        { name: 'recName', type: 'boolean', isOptional: true },
        { name: 'medName', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isOptional: true },
        { name: 'medType', type: 'string', isOptional: true }, // Assuming MeasuresTypeEnum is string
        { name: 'recType', type: 'string', isOptional: true }, // Assuming RecTypeEnum is string
        { name: 'user_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
    ],
});

export { recMedSchema };
