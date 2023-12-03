import { SText, SVStack } from '@components/core';
import { SRowCard } from '@components/modelucules/SRowCard';
import { SSearchModal } from '@components/organisms/SSearchModal';
import { useGetDatabase } from '@hooks/database/useGetDatabaseOld';
import { addDotsText } from '@utils/helpers/addDotsText';
import React, { useEffect } from 'react';
import { useCallback, useState } from 'react';

export function SSearchSimpleModal<T>({
    showModal,
    setShowModal,
    renderTopItem,
    onSelect,
    isLoading: isLoadingComponent,
    onFetchFunction,
    onGetLabel,
    title,
    onConfirm,
    onConfirmInput,
    placeholder,
}: {
    showModal: boolean;
    setShowModal: (open: boolean) => void;
    onSelect: (data: T) => void;
    isLoading?: boolean;
    title: string;
    renderTopItem?: () => React.ReactElement;
    onGetLabel: (data: T) => string;
    onConfirm?: (value: string) => void;
    onConfirmInput?: (value: string) => void;
    onFetchFunction: (search: string) => Promise<(T & { id: any })[]>;
    placeholder?: string;
}) {
    const [search, setSearch] = useState('');
    const searchRef = React.useRef<any>(null);

    const fetch = useCallback(() => {
        return onFetchFunction(search);
    }, [onFetchFunction, search]);

    const { data, isLoading, isError } = useGetDatabase({
        onFetchFunction: fetch,
    });

    const handlePress = (data: T) => {
        setShowModal(false);
        onSelect(data);
    };

    const handleConfirm = () => {
        const value = searchRef.current.value;
        onConfirm?.(value);
    };

    const handleConfirmInput = () => {
        const value = searchRef.current.value;
        onConfirmInput?.(value);
    };

    useEffect(() => {
        if (showModal) {
            searchRef.current?.focus?.();
            searchRef.current?.clear?.();
            setSearch('');
        }
    }, [showModal]);

    return (
        <SSearchModal
            showModal={showModal}
            debounceTime={300}
            onShowModal={setShowModal}
            isError={isError}
            placeholder={placeholder}
            title={title}
            searchRef={searchRef}
            onConfirm={onConfirm ? handleConfirm : undefined}
            onConfirmInput={onConfirmInput && search.trim().length > 1 ? handleConfirmInput : undefined}
            data={data}
            renderTopItem={renderTopItem}
            isLoading={isLoading || isLoadingComponent}
            onSearch={setSearch}
            renderItem={({ item }) => (
                <SRowCard disabled={isLoadingComponent} onPress={() => handlePress(item)}>
                    <SVStack space={1}>
                        <SText>{onGetLabel(item)}</SText>
                    </SVStack>
                </SRowCard>
            )}
        />
    );
}
