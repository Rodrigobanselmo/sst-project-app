import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { ProfessionalTypeEnum } from '@constants/enums/professional-type.enum';
import { IUser } from '@interfaces/IUser';
import { api } from '@services/api';

export interface IUpdateUser {
    name?: string;
    cpf?: string;
    type?: ProfessionalTypeEnum;
    crea?: string;
    crm?: string;
    googleExternalId?: string | null;
    googleUser?: string | null;
    formation?: string[];
    certifications?: string[];
    councils?: {
        councilType?: string;
        councilUF?: string;
        councilId?: string;
    }[];
    token?: string;
    oldPassword?: string;
    password?: string;
}

export async function updateUser(data: IUpdateUser) {
    const response = await api.patch<IUser>(ApiRoutesEnum.USERS, data);

    return response.data;
}
