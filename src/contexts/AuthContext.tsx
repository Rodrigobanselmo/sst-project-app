import { IUser } from '@interfaces/IUser';
import { api } from '@services/api';
import { storageAuthTokenGet, storageAuthTokenRemove, storageAuthTokenSave } from '@libs/storage/token';
import { storageUserGet, storageUserRemove, storageUserSave } from '@libs/storage/user';
import { createContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { ISession } from '@interfaces/ISession';
import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { createSession } from '@services/api/session/createSession';
import { UserAuthRepository } from '@repositories/userAuthRepository';
import { CompanyRepository } from '@repositories/companyRepository';
import { getCompanies } from '@services/api/company/getCompanies';
import { getCompany } from '@services/api/company/getCompany/getCompany';

export const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

export interface AuthProviderProps {
    children: ReactNode;
}

export interface AuthContextProps {
    user: IUser;
    updateUserProfile: (user: IUser) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    isLoadingUserStorageData: boolean;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<IUser>({} as IUser);
    const [isLoadingUserStorageData, setIsLoadingUserStorageData] = useState(true);

    const userAndTokenUpdate = (user: IUser, token: string) => {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
    };

    const storageUserAndTokenSave = async (user: IUser, token: string, refresh_token: string) => {
        try {
            setIsLoadingUserStorageData(true);
            await storageUserSave(user);
            await storageAuthTokenSave({ token, refresh_token });
        } catch (error) {
            throw error;
        } finally {
            setIsLoadingUserStorageData(false);
        }
    };

    const storageUserAndTokenGet = async () => {
        try {
            setIsLoadingUserStorageData(true);
            const user = await storageUserGet();
            const { token, refresh_token } = await storageAuthTokenGet();

            return { user, token, refresh_token };
        } catch (error) {
            throw error;
        } finally {
            setIsLoadingUserStorageData(false);
        }
    };

    const storageUserAndTokenRemove = async () => {
        try {
            setIsLoadingUserStorageData(true);
            setUser({} as IUser);
            await storageAuthTokenRemove();
            await storageUserRemove();
        } catch (error) {
            throw error;
        } finally {
            setIsLoadingUserStorageData(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const data = await createSession({
                email,
                password,
            });

            if (data.user && data.token && data.refresh_token) {
                const user = {
                    permissions: data.permissions,
                    roles: data.roles,
                    companyId: data.companyId,
                    ...data.user,
                };
                const userRepository = new UserAuthRepository();

                await userRepository.create({ id: user.id });

                await storageUserAndTokenSave(user, data.token, data.refresh_token);
                userAndTokenUpdate(user, data.token);
                const companyRepository = new CompanyRepository();
                const company = await getCompany(data.companyId);
                await companyRepository.upsertByApiId({
                    ...company,
                    apiId: company.id,
                    userId: user.id,
                    workspace: company.workspace?.map((workspace) => ({
                        ...workspace,
                        ...workspace.address,
                        userId: user.id,
                        apiId: workspace.id,
                    })),
                });
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const signOut = useCallback(async () => {
        try {
            await storageUserAndTokenRemove();
        } catch (error) {
            throw error;
        }
    }, []);

    const loadUserData = async () => {
        try {
            const { user, token } = await storageUserAndTokenGet();

            if (token && user) {
                userAndTokenUpdate(user, token);
            }
        } catch (error) {
            throw error;
        }
    };

    const updateUserProfile = async (user: IUser) => {
        try {
            setUser(user);
            await storageUserSave(user);
        } catch (error) {
            throw error;
        }
    };

    useEffect(() => {
        loadUserData();
    }, []);

    useEffect(() => {
        const subscriber = api.registerInterceptTokenManager(signOut);
        return () => subscriber();
    }, [signOut]);

    return (
        <AuthContext.Provider
            value={{
                user,
                signIn,
                signOut,
                isLoadingUserStorageData,
                updateUserProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
