import { useCallback, useContext, useEffect, useState } from 'react';

import { AuthContext } from '@contexts/AuthContext';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { UserAuthRepository } from '@repositories/userAuthRepository';
import { useAuth } from '../useAuth';
import { database } from '@libs/watermelon';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { RiskModel } from '@libs/watermelon/model/RiskModel';

export function useGetUser() {
    const [userDatabase, setUserDB] = useState<UserAuthModel>();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    const fetchWorkspaces = useCallback(async () => {
        try {
            const userRepository = new UserAuthRepository();
            const { user: userDB } = await userRepository.findOne(user.id);

            setUserDB(userDB);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        let isMounted = true;

        if (isMounted) {
            fetchWorkspaces();
        }

        return () => {
            isMounted = false;
        };
    }, [fetchWorkspaces]);

    return { user, userDatabase, setIsLoading, isLoading };
}
