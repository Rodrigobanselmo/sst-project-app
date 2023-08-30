import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const characterizationHierarchySchema = tableSchema({
    name: DBTablesEnum.MM_CHARACTERIZATION_HIERARCHY,
    columns: [
        { name: 'characterizationId', type: 'string' },
        { name: 'hierarchyId', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
    ],
});

export { characterizationHierarchySchema };
