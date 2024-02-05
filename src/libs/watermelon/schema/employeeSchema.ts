import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const employeeSchema = tableSchema({
    name: DBTablesEnum.EMPLOYEE,
    columns: [
        { name: 'apiId', type: 'number', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'cpf', type: 'string' }, // Assuming HierarchyEnum is string
        { name: 'socialName', type: 'string', isOptional: true },
        { name: 'rg', type: 'string', isOptional: true },
        { name: 'companyId', type: 'string' },
        { name: 'user_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'hierarchyId', type: 'string', isOptional: true },
    ],
});

export { employeeSchema };
