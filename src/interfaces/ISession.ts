import { IUser } from './IUser';

export type ISession = {
    companyId: string;
    permissions: string[];
    roles: string[];
    token: string;
    refresh_token: string;
    user: IUser;
};
