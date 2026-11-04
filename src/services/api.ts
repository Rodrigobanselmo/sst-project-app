import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { storageAuthTokenGet, storageAuthTokenSave } from '@libs/storage/disk/token';
import { storageUserGet } from '@libs/storage/disk/user';
import axios, { AxiosInstance } from 'axios';
import { installTokenManager } from './token-manager';

interface APIInstanceProps extends AxiosInstance {
    registerInterceptTokenManager: (signOut: () => void | Promise<void>) => () => void;
}

// Public build-time URL lets native test builds use an isolated API. Production keeps its existing default.
const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.simplesst.com.br/' }) as APIInstanceProps;

api.registerInterceptTokenManager = (signOut) => installTokenManager(api, {
    getTokens: storageAuthTokenGet,
    saveTokens: storageAuthTokenSave,
    getRefreshContext: async () => ({ companyId: (await storageUserGet())?.companyId }),
    getActor: async () => {
        const user = await storageUserGet();
        return user?.id ? `${user.id}:${user.companyId || ''}` : null;
    },
    signOut,
    refreshPath: ApiRoutesEnum.REFRESH,
});

export { api };
