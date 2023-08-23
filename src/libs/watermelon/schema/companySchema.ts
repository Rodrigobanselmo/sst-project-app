import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const companySchema = tableSchema({
    name: DBTablesEnum.COMPANY,
    columns: [
        { name: 'apiId', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'cnpj', type: 'string' },
        { name: 'fantasy', type: 'string' },
        { name: 'logoUrl', type: 'string' },
        { name: 'isClinic', type: 'boolean' },
        { name: 'isConsulting', type: 'boolean' },
        { name: 'status', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
    ],
});

export { companySchema };
