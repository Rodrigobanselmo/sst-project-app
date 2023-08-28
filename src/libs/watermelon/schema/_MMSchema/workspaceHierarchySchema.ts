import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const workspaceHierarchySchema = tableSchema({
    name: DBTablesEnum.MM_WOKSPACE_HIERARCHY,
    columns: [
        { name: 'workspaceId', type: 'string' },
        { name: 'hierarchyId', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
    ],
});

export { workspaceHierarchySchema };
