import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const workspaceSchema = tableSchema({
    name: DBTablesEnum.WORKSPACE,
    columns: [
        { name: 'apiId', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'abbreviation', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'startChar_at', type: 'number', isIndexed: true, isOptional: true },

        { name: 'cep', type: 'string', isOptional: true },
        { name: 'street', type: 'string', isOptional: true },
        { name: 'neighborhood', type: 'string', isOptional: true },
        { name: 'city', type: 'string', isOptional: true },
        { name: 'state', type: 'string', isOptional: true },
        { name: 'number', type: 'string', isOptional: true },
        { name: 'complement', type: 'string', isOptional: true },

        { name: 'companyId', type: 'string' },

        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
    ],
});

export { workspaceSchema };
