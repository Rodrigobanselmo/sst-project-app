import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { ProfessionalTypeEnum } from '@constants/enums/professional-type.enum';
import { IUser } from '@interfaces/IUser';
import { storageAuthTokenGet, storageAuthTokenSave } from '@libs/storage/disk/token';
import { api } from '@services/api';
import { DeduplicationEnum, deduplicator } from '@utils/helpers/deduplication';

export interface IUpdateUser {
    companyId?: string;
}

export interface IResponseGetRefreshToken {
    companyId: string;
    permissions: string[];
    roles: string[];
    refresh_token: string;
    token: string;
    user: IUser;
}

export async function refreshToken(props?: IUpdateUser) {
    const { refresh_token } = await storageAuthTokenGet();
    const { data } = await deduplicator.execute(
        async () =>
            api.post<IResponseGetRefreshToken>(ApiRoutesEnum.REFRESH, {
                refresh_token,
                companyId: props?.companyId,
                isApp: true,
            }),
        DeduplicationEnum.REFRESH,
    );

    await storageAuthTokenSave({ token: data.token, refresh_token: data.refresh_token });

    return {
        token: data.token,
        refresh_token: data.refresh_token,
    };
}
