/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from 'react';

import { useDebouncedCallback } from 'use-debounce';

interface IUseSearch<T> {
    loadingFeedback?: boolean;
}

export const useSearch = <T>({ loadingFeedback }: IUseSearch<T> = {}) => {
    const [search, setSearch] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleSearchChangeDebounce = useDebouncedCallback((value: string) => {
        setSearch(value);
        if (loadingFeedback) setIsLoading(false);
    }, 300);

    const handleDebounceSearch = useCallback(
        (value: string) => {
            handleSearchChangeDebounce(value);
            if (loadingFeedback) setIsLoading(true);
        },
        [loadingFeedback],
    );

    return { handleDebounceSearch, setSearch, isLoading, search };
};
