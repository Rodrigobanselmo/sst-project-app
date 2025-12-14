import { SText, SVStack } from '@components/core';
import { SRowCard } from '@components/modelucules/SRowCard';
import { SSearchModal } from '@components/organisms/SSearchModal';
import React, { useEffect, useRef, useState } from 'react';
import { unstable_batchedUpdates } from 'react-native';

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
    disableNoInternetContent,
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
    disableNoInternetContent?: boolean;
    placeholder?: string;
}) {
    const [search, setSearch] = useState('');
    const [data, setData] = useState<(T & { id: any })[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const searchRef = React.useRef<any>(null);
    const onFetchFunctionRef = useRef(onFetchFunction);
    onFetchFunctionRef.current = onFetchFunction;

    useEffect(() => {
        if (!showModal) {
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        console.log('[SSearchSimpleModal] Fetching with search:', JSON.stringify(search));

        onFetchFunctionRef
            .current(search)
            .then((result) => {
                console.log('[SSearchSimpleModal] Fetch result:', result?.length, 'items', result?.slice(0, 3));
                if (!cancelled) {
                    unstable_batchedUpdates(() => {
                        setData(result || []);
                        setIsLoading(false);
                    });
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    console.error('[SSearchSimpleModal] Fetch error:', error);
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [search, showModal]);

    const handlePress = (data: T) => {
        setShowModal(false);
        onSelect(data);
    };

    const handleConfirm = () => {
        const value = searchRef.current?.value || search;
        if (value && value.trim()) {
            onConfirm?.(value.trim());
        }
    };

    const handleConfirmInput = () => {
        const value = searchRef.current?.value || search;
        if (value && value.trim()) {
            onConfirmInput?.(value.trim());
        }
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
            disableNoInternetContent={disableNoInternetContent}
            showModal={showModal}
            debounceTime={300}
            onShowModal={setShowModal}
            placeholder={placeholder}
            title={title}
            searchRef={searchRef}
            onConfirm={onConfirm ? handleConfirm : undefined}
            onConfirmInput={onConfirmInput && search.trim().length > 1 ? handleConfirmInput : undefined}
            data={data || []}
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
