import { formatCNPJ } from '@brazilian-utils/brazilian-utils';
import { SBox, SCenter, SFlatList, SFormControl, SHStack, SSpinner, SIcon, SText } from '@components/core';
import { SButton, SInput, SLoading } from '@components/modelucules';
import { SRowCard } from '@components/modelucules/SRowCard';
import { SModal } from '@components/organisms/SModal';
import { SCREEN_HEIGHT } from '@constants/constants';
import { ICompany } from '@interfaces/ICompany';
import { useQueryCompanies } from '@services/api/company/getCompanies';
import { addDotsText } from '@utils/helpers/addDotsText';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { SNoInternet } from '@components/modelucules/SNoInternet';
import { SErrorBox } from '@components/modelucules/SErrorBox';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

type MyComponentProps<T> = {
    title: string;
    searchLabel?: string;
    showModal: boolean;
    isError?: boolean;
    isLoading?: boolean;
    handleGoBack?: () => void;
    onShowModal: (open: boolean) => void;
    onSearch: (text: string) => void;
    renderTopItem?: () => React.ReactElement;
    data: (T & { id: any })[];
    renderItem: ({ item }: { item: T }) => React.ReactElement;
};

export const SSearchModal = <T,>({
    showModal,
    isLoading,
    isError,
    onShowModal,
    onSearch,
    renderItem,
    data,
    title,
    renderTopItem,
    handleGoBack,
    searchLabel,
}: MyComponentProps<T>) => {
    const handleSearchChange = useDebouncedCallback((value: string) => {
        onSearch(value);
    }, 600);

    return (
        <SModal isOpen={showModal} height={SCREEN_HEIGHT} px={2} onClose={() => onShowModal(false)} size="full">
            <SModal.Content h={SCREEN_HEIGHT}>
                <SModal.CloseButton />
                <SModal.Header>
                    <SHStack>
                        {handleGoBack && (
                            <TouchableOpacity style={{ paddingRight: 5 }} onPress={handleGoBack}>
                                <SIcon as={Feather} name="arrow-left" color="text.main" size={6} />
                            </TouchableOpacity>
                        )}
                        <SText fontSize={16}>{title}</SText>
                    </SHStack>
                </SModal.Header>
                <SBox px={3} flex={1} py={3}>
                    {renderTopItem?.()}
                    <SFormControl>
                        {searchLabel && <SFormControl.Label>{searchLabel}</SFormControl.Label>}
                        <SInput placeholder="Pesquisar" onChangeText={handleSearchChange} />
                    </SFormControl>
                    {isLoading && <SSpinner color={'primary.main'} size={32} />}
                    <SErrorBox showError={isError}>
                        <SNoInternet>
                            <SFlatList
                                data={data}
                                keyExtractor={(item) => item.id}
                                renderItem={renderItem}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 2 }}
                            />
                        </SNoInternet>
                    </SErrorBox>
                </SBox>
                <SModal.Footer>
                    <SHStack space={2}>
                        <SButton
                            title="Cancel"
                            variant="ghost"
                            h={10}
                            width={20}
                            onPress={() => {
                                onShowModal(false);
                            }}
                        />
                        {/* <SButton
                            title="Selecionar"
                            h={10}
                            width={100}
                            onPress={() => {
                                onShowModal(false);
                            }}
                        /> */}
                    </SHStack>
                </SModal.Footer>
            </SModal.Content>
        </SModal>
    );
};
