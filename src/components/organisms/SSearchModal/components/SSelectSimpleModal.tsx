import { SBox, SText, SVStack } from '@components/core';
import { SRowCard } from '@components/modelucules/SRowCard';
import { SSearchModal } from '@components/organisms/SSearchModal';
import React from 'react';

interface ISelectSimpleModalProps<T, R> {
    showModal: boolean;
    setShowModal: (open: boolean) => void;
    onSelect: (data: T, description?: R) => void;
    data: (T & { id: string })[];
    title: string;
    renderTopItem?: () => React.ReactElement;
    onGetDescriptions?: (data: T) => R[];
    onGetLabel: (data: T) => string;
    onGetDescriptionLabel?: (item: R) => string;
    disableNoInternetContent?: boolean;
    placeholder?: string;
}

export function SSelectSimpleModal<T, R>({
    showModal,
    setShowModal,
    renderTopItem,
    onSelect,
    onGetDescriptionLabel,
    onGetDescriptions,
    onGetLabel,
    title,
    data,
    placeholder,
    disableNoInternetContent,
}: ISelectSimpleModalProps<T, R>) {
    const handlePress = (data: T, description?: R) => {
        setShowModal(false);
        onSelect(data, description);
    };

    return (
        <SSearchModal
            disableNoInternetContent={disableNoInternetContent}
            showModal={showModal}
            debounceTime={300}
            onShowModal={setShowModal}
            placeholder={placeholder}
            title={title}
            data={data}
            renderTopItem={renderTopItem}
            renderItem={({ item }) => {
                const descriptions = onGetDescriptions?.(item);

                if (!descriptions?.length) {
                    return (
                        <SRowCard onPress={() => handlePress(item)}>
                            <SVStack space={1}>
                                <SText>{onGetLabel(item)}</SText>
                            </SVStack>
                        </SRowCard>
                    );
                }

                if (!onGetDescriptionLabel) throw new Error('onGetDescriptionLabel is required');

                return (
                    <>
                        <SText color="gray.300" mb={2}>
                            {onGetLabel(item)}
                        </SText>
                        <SVStack space={1} mb={4}>
                            {descriptions.map((description, index) => (
                                <SRowCard key={index} onPress={() => handlePress(item, description)}>
                                    <SVStack space={1}>
                                        <SText>{onGetDescriptionLabel(description)}</SText>
                                    </SVStack>
                                </SRowCard>
                            ))}
                        </SVStack>
                    </>
                );
            }}
        />
    );
}
