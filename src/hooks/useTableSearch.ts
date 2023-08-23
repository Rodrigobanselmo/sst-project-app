/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';

import Fuse from 'fuse.js';
import sortArray from 'sort-array';
import { useDebouncedCallback } from 'use-debounce';

interface IUseTableSearch<T> {
    data: T[];
    keys: Fuse.FuseOptionKey<any>[];
    rowsPerPage?: number;
    minLengthSearch?: number;
    sortFunction?: (array: T[]) => T[];
    transformSearchTextBefore?: (search: string) => string;
}

export const useTableSearch = <T>({
    data,
    keys,
    sortFunction,
    rowsPerPage,
    minLengthSearch,
    transformSearchTextBefore,
}: IUseTableSearch<T>) => {
    const [search, setSearch] = useState<string>('');
    const [page, setPage] = useState(1);

    const handleSearchChange = useDebouncedCallback((value: string) => {
        setSearch(value);
        setPage(1);
    }, 300);

    const fuse = useMemo(() => {
        return new Fuse(data, { keys, ignoreLocation: true });
    }, [data, keys]);

    const results = useMemo(() => {
        let searchValue = minLengthSearch && minLengthSearch > 0 && search.length < minLengthSearch ? '' : search;

        if (transformSearchTextBefore) {
            searchValue = transformSearchTextBefore(searchValue);
        }

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
