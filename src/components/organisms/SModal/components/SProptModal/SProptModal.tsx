import { SBox, SFormControl, SHStack, SSpinner, SText } from '@components/core';
import { SButton, SInput } from '@components/modelucules';
import { SModal } from '@components/organisms/SModal';
import { SCREEN_HEIGHT } from '@constants/constants';
import { Center } from 'native-base';
import { useEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { useDebouncedCallback } from 'use-debounce';

type MyComponentProps = {
    title: string;
    subtitle?: string;
    searchLabel?: string;
    showModal: boolean;
    isLoading?: boolean;
    onShowModal: (open: boolean) => void;
    onSearch?: (text: string) => void;
    onConfirm?: (value: string) => void;
    debounceTime?: number;
    placeholder?: string;
    confirmButtonLabel?: string;
    cancelButtonLabel?: string;
};

export const SProptModal = ({
    showModal,
    isLoading,
    onShowModal,
    onSearch,
    title,
    subtitle,
    searchLabel,
    onConfirm,
    debounceTime = 600,
    confirmButtonLabel = 'Confirmar',
    cancelButtonLabel = 'Cancelar',
    placeholder = 'Pesquisar',
}: MyComponentProps) => {
    const searchRef = useRef<any>(null);
    const handleSearchChange = useDebouncedCallback((value: string) => {
        onSearch?.(value);
    }, debounceTime);

    return (
        <SModal isOpen={showModal} height={SCREEN_HEIGHT} px={2} onClose={() => onShowModal(false)} size="full">
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <KeyboardAvoidingView
                    style={{ width: '100%', paddingBottom: 50 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
                >
                    <Center>
                        <SModal.Content h={270}>
                            <SModal.CloseButton />
                            <SModal.Header>
                                <SText fontSize={16}>{title}</SText>
                            </SModal.Header>

                            <SBox px={3} flex={1} py={3}>
                                {subtitle && <SText fontSize={14}>{subtitle}</SText>}
                                <SFormControl>
                                    {searchLabel && <SFormControl.Label>{searchLabel}</SFormControl.Label>}
                                    <SInput
                                        mt={3}
                                        autoFocus
                                        ref={searchRef}
                                        placeholder={placeholder}
                                        onChangeText={(v) => {
                                            handleSearchChange(v);
                                            if (searchRef?.current) {
                                                searchRef.current.value = v;
                                            }
                                        }}
                                    />
                                </SFormControl>
                                {isLoading && <SSpinner color={'primary.main'} size={32} />}
                            </SBox>

                            <SModal.Footer>
                                <SHStack space={2}>
                                    <SButton
                                        title={cancelButtonLabel}
                                        variant="ghost"
                                        h={10}
                                        width={20}
                                        onPress={() => {
                                            onShowModal(false);
                                        }}
                                    />
                                    {onConfirm && (
                                        <SButton
                                            title={confirmButtonLabel}
                                            h={10}
                                            width={100}
                                            onPress={() => {
                                                onShowModal(false);
                                                onConfirm(searchRef.current.value);
                                            }}
                                        />
                                    )}
                                </SHStack>
                            </SModal.Footer>
                        </SModal.Content>
                    </Center>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </SModal>
    );
};
