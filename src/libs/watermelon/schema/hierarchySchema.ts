import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const hierarchySchema = tableSchema({
    name: DBTablesEnum.HIERARCHY,
    columns: [
        { name: 'apiId', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' }, // Assuming HierarchyEnum is string
        { name: 'description', type: 'string', isOptional: true },
        { name: 'realDescription', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'companyId', type: 'string', isOptional: true },
        { name: 'parentId', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
    ],
});

export { hierarchySchema };
