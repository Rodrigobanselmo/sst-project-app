import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const characterizationEmployeeSchema = tableSchema({
    name: DBTablesEnum.MM_CHARACTERIZATION_EMPLOYEE,
    columns: [
        { name: 'characterizationId', type: 'string' },
        { name: 'employeeId', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
    ],
});

export { characterizationEmployeeSchema };
