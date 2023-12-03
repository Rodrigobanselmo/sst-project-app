import { useEffect } from 'react';

import { UserAuthRepository } from '@repositories/userAuthRepository';
import { useAuth } from '../useAuth';
import { useGetDatabase } from './useGetDatabase';

const fetchWorkspaces = async ({ userId }: { userId: number }) => {
    const userRepository = new UserAuthRepository();
    const { user: userDB } = await userRepository.findOne(userId);

    return userDB;
};

export function useGetUser() {
    const { user } = useAuth();
    const { data, fetch, isLoading, setIsLoading } = useGetDatabase({
        onFetchFunction: () =>
            fetchWorkspaces({
                userId: user.id,
            }),
    });

    useEffect(() => {
        fetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.id]);

    return { user, userDatabase: data, setIsLoading, isLoading };
}
