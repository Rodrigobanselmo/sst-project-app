import { useCallback, useEffect, useState } from 'react';

import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { RiskRepository } from '@repositories/riskRepository';

interface IUseGetRiskDatabase {
    riskId: string;
}

export function useGetRiskDatabase({ riskId }: IUseGetRiskDatabase) {
    const [risk, setRisk] = useState<RiskModel | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRisk = useCallback(async () => {
        try {
            const riskRepository = new RiskRepository();
            const { risk } = await riskRepository.findOne(riskId);

            setRisk(risk);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [riskId]);

    useEffect(() => {
        let isMounted = true;

        if (isMounted) {
            fetchRisk();
        }

        return () => {
            isMounted = false;
        };
    }, [fetchRisk]);

    return { risk, setIsLoading, isLoading };
}
