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

    useEffect(() => {
        const fetch = async () => {
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
        };

        let isMounted = true;

        if (isMounted) {
            fetch();
        }

        return () => {
            isMounted = false;
        };
    }, [onFetchFunction]);

    return { data, isError, setIsLoading, isLoading, refetch: fetch };
}
