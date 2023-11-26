import { useSearch } from '@hooks/useSearch';
import React, { useEffect } from 'react';
import { SInputSearch, SInputSearchProps } from './SInputSearch';

interface SInputLoadingSearch extends SInputSearchProps {}

export const SInputLoadingSearch = React.forwardRef<any, SInputLoadingSearch>(({ onSearchChange, ...props }, ref) => {
    const { handleDebounceSearch, setSearch, isLoading, search } = useSearch({ loadingFeedback: true });

    useEffect(() => {
        onSearchChange?.(search);
    }, [onSearchChange, search]);

    return (
        <SInputSearch
            {...props}
            clearButtonAction={() => setSearch('')}
            onSearchChange={handleDebounceSearch}
            isLoading={isLoading}
            ref={ref}
        />
    );
});
