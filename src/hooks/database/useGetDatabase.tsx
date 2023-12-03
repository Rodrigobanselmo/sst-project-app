import { useCallback, useEffect, useState } from 'react';

import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { RiskRepository } from '@repositories/riskRepository';
import { Model } from '@nozbe/watermelondb';
import { unstable_batchedUpdates } from 'react-native';

interface IUseGetRiskDatabase<T> {
    onFetchFunction: () => Promise<T>;
}

export function useGetDatabase<T>({ onFetchFunction }: IUseGetRiskDatabase<T>) {
    const [data, setData] = useState<T>();
    const [isLoading, setIsLoading] = useState(true);

    const fetch = async () => {
        try {
            const fetchData = await onFetchFunction();

            unstable_batchedUpdates(() => {
                setIsLoading(false);
                setData(fetchData);
            });
        } catch (error) {
            setIsLoading(false);
            console.error(error);
        }
    };

    return { data, setIsLoading, isLoading, fetch };
}
