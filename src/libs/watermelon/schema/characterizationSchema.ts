import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const characterizationSchema = tableSchema({
    name: DBTablesEnum.COMPANY_CHARACTERIZATION,
    columns: [
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'profileParentId', type: 'string', isOptional: true },
        { name: 'profileName', type: 'string', isOptional: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isOptional: true },
        { name: 'noiseValue', type: 'string', isOptional: true },
        { name: 'temperature', type: 'string', isOptional: true },
        { name: 'luminosity', type: 'string', isOptional: true },
        { name: 'moisturePercentage', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
    ],
});

export { characterizationSchema };
