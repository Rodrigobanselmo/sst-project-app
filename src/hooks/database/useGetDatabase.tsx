import { useCallback, useEffect, useState } from 'react';

import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { RiskRepository } from '@repositories/riskRepository';
import { Model } from '@nozbe/watermelondb';

interface IUseGetRiskDatabase<T> {
    onFetchFunction: () => Promise<T[]>;
}

export function useGetDatabase<T>({ onFetchFunction }: IUseGetRiskDatabase<T>) {
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const fetch = useCallback(async () => {
        try {
            const fetchData = await onFetchFunction();

            setData(fetchData);
            setIsError(false);
        } catch (error) {
            console.error(error);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    }, [onFetchFunction]);

    useEffect(() => {
        let isMounted = true;

        if (isMounted) {
            fetch();
        }

        return () => {
            isMounted = false;
        };
    }, [fetch]);

    return { data, isError, setIsLoading, isLoading, refetch: fetch };
}
