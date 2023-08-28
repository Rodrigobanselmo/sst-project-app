import { useCallback, useContext, useEffect, useState } from 'react';

import { AuthContext } from '@contexts/AuthContext';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { UserAuthRepository } from '@repositories/userAuthRepository';
import { useAuth } from './useAuth';
import { database } from '@libs/watermelon';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { RiskRepository } from '@repositories/riskRepository';

interface IUseGetRiskDatabase {
    riskIds?: string[];
}

export function useGetRisksDatabase({ riskIds }: IUseGetRiskDatabase) {
    const [risks, setRisks] = useState<RiskModel[]>([]);
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    const fetchRisks = useCallback(async () => {
        try {
            const riskRepository = new RiskRepository();
            const risksData = [];

            if (riskIds) {
                const { risks } = await riskRepository.findByIds({ ids: riskIds });
                risksData.push(...risks);
            } else {
                const { risks } = await riskRepository.findMany({ userId: user.id });
                risksData.push(...risks);
            }

            setRisks(risksData);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [user.id, riskIds]);

    useEffect(() => {
        let isMounted = true;

        if (isMounted) {
            fetchRisks();
        }

        return () => {
            isMounted = false;
        };
    }, [fetchRisks]);

    return { user, risks, setIsLoading, isLoading };
}
