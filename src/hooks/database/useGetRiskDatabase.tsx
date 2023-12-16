import { useCallback, useEffect, useState } from 'react';

import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { RiskRepository } from '@repositories/riskRepository';
import { useGetDatabase } from './useGetDatabase';

interface IUseGetRiskDatabase {
    riskId: string;
}

const onFetchRisk = async ({ riskId }: IUseGetRiskDatabase) => {
    if (!riskId) return null;

    const riskRepository = new RiskRepository();
    const { risk } = await riskRepository.findOne(riskId);

    return risk;
};

export function useGetRiskDatabase({ riskId }: IUseGetRiskDatabase) {
    const { data, fetch, isLoading, setIsLoading } = useGetDatabase({
        onFetchFunction: () => onFetchRisk({ riskId }),
    });

    useEffect(() => {
        fetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [riskId]);

    return { risk: data, setIsLoading, isLoading };
}
