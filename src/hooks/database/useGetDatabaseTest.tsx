import { useCallback, useEffect, useState } from 'react';

import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { RiskRepository } from '@repositories/riskRepository';
import { Model } from '@nozbe/watermelondb';
import { unstable_batchedUpdates } from 'react-native';

interface IUseGetRiskDatabase<T, R extends object> {
    onFetchFunction: (props: R) => Promise<T[]>;
    params: R;
}

export function useGetDatabase<T, R extends object>({ onFetchFunction, params }: IUseGetRiskDatabase<T, R>) {
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetch = async () => {
        try {
            const fetchData = await onFetchFunction(params);

            unstable_batchedUpdates(() => {
                setIsLoading(false);
                setData(fetchData);
            });
        } catch (error) {
            setIsLoading(false);
            console.error(error);
        }
    };

    useEffect(() => {
        fetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Object.values(params)]);

    return { data, setIsLoading, isLoading, fetch };
}
