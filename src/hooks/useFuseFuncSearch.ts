/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';

import Fuse, { FuseOptionKey, IFuseOptions } from 'fuse.js';
import { normalizeString } from '@utils/helpers/normalizeString';

interface IUseTableSearch<T> {
    minLengthSearch?: number;
    sortFunction?: (array: T[]) => T[];
    transformSearchTextBefore?: (search: string) => string;
    keys: FuseOptionKey<any>[];
    fuseOptions?: Partial<IFuseOptions<T>>;
}

export interface IReturnUseFuseSearch<T> {
    getResult: ({ data, search }: { data: T[]; search: string }) => T[];
    fuse: Fuse<T> | null;
    isFuseReady: boolean;
}

export const useFuseFuncSearch = <T>({
    sortFunction,
    minLengthSearch,
    transformSearchTextBefore,
    keys,
    fuseOptions,
}: IUseTableSearch<T>): IReturnUseFuseSearch<T> => {
    const getFn = useCallback((obj: any, path: any) => {
        const value = Fuse.config.getFn(obj, path);
        if (Array.isArray(value)) {
            return value.map((el) => normalizeString(el));
        }

        return normalizeString(value as string);
    }, []);

    const getResult = useCallback(
        ({ data, search = '' }: { data: T[]; search: string }) => {
            console.log(
                '[useFuseFuncSearch] getResult called with:',
                data?.length,
                'items, search:',
                JSON.stringify(search),
            );

            // Always create a new Fuse instance with the current data to ensure accurate search
            const fuseValue = new Fuse(data, { keys, ignoreLocation: true, threshold: 0.4, getFn, ...fuseOptions });

            let searchValue = minLengthSearch && minLengthSearch > 0 && search.length < minLengthSearch ? '' : search;

            if (transformSearchTextBefore) {
                searchValue = transformSearchTextBefore(searchValue);
            }

            // Normalize search string to match data normalization (fixes iOS keyboard input issues)
            searchValue = normalizeString(searchValue);

            console.log('[useFuseFuncSearch] Normalized searchValue:', JSON.stringify(searchValue));

            const fuseResults = fuseValue.search(searchValue, { limit: 50 });
            console.log('[useFuseFuncSearch] Fuse raw results:', fuseResults.length);

            const resultSearch = searchValue
                ? fuseResults.map((result) => result.item)
                : sortFunction
                  ? Array.isArray(data)
                      ? sortFunction(data)
                      : []
                  : data;

            console.log('[useFuseFuncSearch] Final resultSearch:', resultSearch.length);
            return resultSearch;
        },
        [keys, minLengthSearch, sortFunction, transformSearchTextBefore, getFn, fuseOptions],
    );

    return { getResult, fuse: null, isFuseReady: true };
};
