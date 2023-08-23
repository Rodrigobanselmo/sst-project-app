import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { database } from '@libs/watermelon';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';

export interface IUserCreate {
    id: number;
}

export class UserAuthRepository {
    constructor() {}

    async findOne(id: number) {
        const userTable = database.get<UserAuthModel>(DBTablesEnum.USER_AUTH);

        const user = await userTable.find(String(id));

        return { user };
    }

    async create(data: IUserCreate) {
        await database.write(async () => {
            const userTable = database.get<UserAuthModel>(DBTablesEnum.USER_AUTH);

            try {
                await userTable.find(String(data.id));
            } catch (error) {
                await userTable.create((user) => {
                    user._raw.id = String(data.id);
                    user.created_at = new Date();
                    user.updated_at = new Date();
                });
            }
        });
    }
}
