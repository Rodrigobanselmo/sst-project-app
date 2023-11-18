/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react';

import Fuse from 'fuse.js';
import sortArray from 'sort-array';
import { useDebouncedCallback } from 'use-debounce';
import { normalizeString } from '@utils/helpers/normalizeString';

interface IUseTableSearch<T> {
    minLengthSearch?: number;
    sortFunction?: (array: T[]) => T[];
    transformSearchTextBefore?: (search: string) => string;
    keys: Fuse.FuseOptionKey<any>[];
    fuseOptions?: Partial<Fuse.IFuseOptions<T>>;
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
    const [fuse, setFuse] = useState<Fuse<T> | null>(null);

    const getFn = useCallback((obj: any, path: any) => {
        const value = Fuse.config.getFn(obj, path);
        if (Array.isArray(value)) {
            return value.map((el) => normalizeString(el));
        }

        return normalizeString(value as string);
    }, []);

    const getResult = useCallback(
        ({ data, search = '' }: { data: T[]; search: string }) => {
            let fuseValue = fuse;

            if (!fuseValue) {
                fuseValue = new Fuse(data, { keys, ignoreLocation: true, threshold: 0.4, getFn, ...fuseOptions });
                setFuse(fuseValue);
            }

            let searchValue = minLengthSearch && minLengthSearch > 0 && search.length < minLengthSearch ? '' : search;

            if (transformSearchTextBefore) {
                searchValue = transformSearchTextBefore(searchValue);
            }

            const fuseResults = fuseValue.search(searchValue, { limit: 50 });
            const resultSearch = searchValue
                ? fuseResults.map((result) => result.item)
                : sortFunction
                ? Array.isArray(data)
                    ? sortFunction(data)
                    : []
                : data;
            return resultSearch;
        },
        // remove fuse sate from dependencies
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [keys, minLengthSearch, sortFunction, transformSearchTextBefore, getFn],
    );

    return { getResult, fuse, isFuseReady: !!fuse };
};
