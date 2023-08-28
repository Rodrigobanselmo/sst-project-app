import { formatCNPJ } from '@brazilian-utils/brazilian-utils';
import { SBox, SCenter, SFlatList, SFormControl, SHStack, SSpinner, SIcon, SText } from '@components/core';
import { SButton, SInput, SLoading, SNoContent } from '@components/modelucules';
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
import { Keyboard, KeyboardAvoidingView, Platform, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
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
    onConfirm?: () => void;
    onConfirmInput?: () => void;
    searchRef?: any;
    debounceTime?: number;
    placeholder?: string;
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
    onConfirm,
    searchRef,
    onConfirmInput,
    debounceTime = 600,
    placeholder = 'Pesquisar',
}: MyComponentProps<T>) => {
    const handleSearchChange = useDebouncedCallback((value: string) => {
        onSearch(value);
    }, debounceTime);

    return (
        <SModal isOpen={showModal} height={SCREEN_HEIGHT} px={2} onClose={() => onShowModal(false)} size="full">
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
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
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior="padding"
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
                    >
                        <SBox px={3} flex={1} py={3}>
                            {renderTopItem?.()}
                            <SFormControl>
                                {searchLabel && <SFormControl.Label>{searchLabel}</SFormControl.Label>}
                                <SInput
                                    ref={searchRef}
                                    placeholder={placeholder}
                                    onChangeText={(v) => {
                                        handleSearchChange(v);
                                        if (searchRef?.current) {
                                            searchRef.current.value = v;
                                        }
                                    }}
                                    {...(onConfirmInput && {
                                        InputRightElement: (
                                            <SButton
                                                title="adicionar"
                                                autoWidth
                                                addColor
                                                onPress={() => {
                                                    onShowModal(false);
                                                    onConfirmInput();
                                                }}
                                            />
                                        ),
                                    })}
                                />
                            </SFormControl>
                            {isLoading && <SSpinner color={'primary.main'} size={32} />}
                            <SErrorBox showError={isError}>
                                <SNoInternet>
                                    {!data.length && <SNoContent />}
                                    <SFlatList
                                        data={data}
                                        keyboardShouldPersistTaps={'handled'}
                                        keyExtractor={(item) => item.id}
                                        renderItem={renderItem}
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{ paddingHorizontal: 2 }}
                                    />
                                </SNoInternet>
                            </SErrorBox>
                        </SBox>
                    </KeyboardAvoidingView>
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
                            {onConfirm && (
                                <SButton
                                    title="Confirmar"
                                    h={10}
                                    width={100}
                                    onPress={() => {
                                        onShowModal(false);
                                        onConfirm();
                                    }}
                                />
                            )}
                        </SHStack>
                    </SModal.Footer>
                </SModal.Content>
            </TouchableWithoutFeedback>
        </SModal>
    );
};
