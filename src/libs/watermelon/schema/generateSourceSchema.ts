import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const generateSourceSchema = tableSchema({
    name: DBTablesEnum.GENERATE_SOURCE, // Replace with the appropriate table name
    columns: [
        { name: 'apiId', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'riskId', type: 'string' },
        { name: 'user_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
    ],
});

export { generateSourceSchema };
