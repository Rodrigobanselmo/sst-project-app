import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { ProfessionalTypeEnum } from '@constants/enums/professional-type.enum';
import { IUser } from '@interfaces/IUser';
import { storageAuthTokenGet, storageAuthTokenSave } from '@libs/storage/token';
import { api } from '@services/api';

export interface IUpdateUser {
    companyId?: string;
}

export async function refreshToken(props?: IUpdateUser) {
    const { refresh_token } = await storageAuthTokenGet();
    const { data } = await api.post(ApiRoutesEnum.REFRESH, { refresh_token, companyId: props?.companyId, isApp: true });

    await storageAuthTokenSave({ token: data.token, refresh_token: data.refresh_token });

    return {
        token: data.token,
        refresh_token: data.refresh_token,
    };
}
