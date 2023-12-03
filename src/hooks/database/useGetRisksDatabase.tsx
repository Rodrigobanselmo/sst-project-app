import { useEffect } from 'react';

import { RiskRepository } from '@repositories/riskRepository';
import { useAuth } from '../useAuth';
import { useGetDatabase } from './useGetDatabase';

interface IUseGetRiskDatabase {
    riskIds?: string[];
    userId?: number;
}

const onFetchRisks = async ({ riskIds, userId }: IUseGetRiskDatabase) => {
    const riskRepository = new RiskRepository();
    const risksData = [];

    if (riskIds) {
        const { risks } = await riskRepository.findByIds({ ids: riskIds });
        risksData.push(...risks);
    } else if (userId) {
        const { risks } = await riskRepository.findMany({ userId });
        risksData.push(...risks);
    }

    return risksData;
};

export function useGetRisksDatabase({ riskIds }: IUseGetRiskDatabase) {
    const { user } = useAuth();
    const { data, fetch, isLoading, setIsLoading } = useGetDatabase({
        onFetchFunction: () => onFetchRisks({ riskIds, userId: user?.id }),
    });

    useEffect(() => {
        fetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [riskIds]);

    return { risks: data, setIsLoading, isLoading };
}
