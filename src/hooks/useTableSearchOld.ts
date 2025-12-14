/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react';

import Fuse, { FuseOptionKey } from 'fuse.js';
import sortArray from 'sort-array';
import { useDebouncedCallback } from 'use-debounce';
import { normalizeString } from '@utils/helpers/normalizeString';

interface IUseTableSearch<T> {
    data: T[];
    keys: FuseOptionKey<any>[];
    rowsPerPage?: number;
    setSearchValue?: (value: string) => void;
    searchValue?: string;
    minLengthSearch?: number;
    sortFunction?: (array: T[]) => T[];
    transformSearchTextBefore?: (search: string) => string;
    onLoadingSearchFn?: (loading: boolean) => void;

    threshold?: number;
}

export const useTableSearch = <T>({
    data,
    keys,
    sortFunction,
    rowsPerPage,
    minLengthSearch,
    transformSearchTextBefore,
    searchValue,
    setSearchValue,
    onLoadingSearchFn,
    threshold = 0.4,
}: IUseTableSearch<T>) => {
    const [searchState, setSearchState] = useState<string>('');

    const search = useMemo(() => {
        return searchValue || searchState;
    }, [searchState, searchValue]);

    const setSearch = (value: string) => {
        if (setSearchValue) setSearchValue(value);
        else setSearchState(value);
    };

    const [page, setPage] = useState(1);

    const handleSearchChangeDebounce = useDebouncedCallback((value: string) => {
        setSearch(value);
        setPage(1);
        onLoadingSearchFn?.(false);
    }, 300);

    const handleSearchChange = useCallback(
        (value: string) => {
            onLoadingSearchFn?.(true);
            handleSearchChangeDebounce(value);
        },
        [handleSearchChangeDebounce, onLoadingSearchFn],
    );

    function getFn(obj: any, path: any) {
        const value = Fuse.config.getFn(obj, path);
        if (Array.isArray(value)) {
            return value.map((el) => normalizeString(el));
        }

        return normalizeString(value as string);
    }

    const fuse = useMemo(() => {
        return new Fuse(data, {
            keys,
            ignoreLocation: true,
            threshold: threshold,
            isCaseSensitive: false,
            getFn,
        });
    }, [data, keys, threshold]);

    const results = useMemo(() => {
        let searchValue = minLengthSearch && minLengthSearch > 0 && search.length < minLengthSearch ? '' : search;

        if (transformSearchTextBefore) {
            searchValue = transformSearchTextBefore(searchValue);
        }

        // Normalize search string to match data normalization (fixes iOS keyboard input issues)
        searchValue = normalizeString(searchValue);

        const fuseResults = fuse.search(searchValue, { limit: 50 });
        const resultSearch = searchValue
            ? fuseResults.map((result) => result.item)
            : sortFunction
              ? Array.isArray(data)
                  ? sortFunction(data)
                  : []
              : data;

        if (rowsPerPage) return resultSearch.slice((page - 1) * rowsPerPage, page * rowsPerPage);
        return resultSearch;
    }, [data, fuse, minLengthSearch, page, rowsPerPage, search, sortFunction, transformSearchTextBefore]);

    return { results, handleSearchChange, fuse, search, page, setPage };
};
