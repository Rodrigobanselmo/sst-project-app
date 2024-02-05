import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const photoSchema = tableSchema({
    name: DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO,
    columns: [
        { name: 'name', type: 'string' },
        { name: 'apiId', type: 'string' },
        { name: 'photoUrl', type: 'string' },
        { name: 'companyCharacterizationId', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
    ],
});

export { photoSchema };
