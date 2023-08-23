import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const userAuthSchema = tableSchema({
    name: DBTablesEnum.USER_AUTH,
    columns: [
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
    ],
});

export { userAuthSchema };
