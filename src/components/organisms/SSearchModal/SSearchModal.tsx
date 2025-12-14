import { SBox, SFlatList, SFormControl, SHStack, SIcon, SText } from '@components/core';
import { SButton, SInput, SNoContent } from '@components/modelucules';
import { SErrorBox } from '@components/modelucules/SErrorBox';
import { ILoadingRef, SLoadContainer } from '@components/modelucules/SLoadContainer/SLoadContainer';
import { SNoInternet } from '@components/modelucules/SNoInternet';
import { SModal } from '@components/organisms/SModal';
import { SCREEN_HEIGHT } from '@constants/constants';
import Feather from '@expo/vector-icons/Feather';
import { Keyboard, KeyboardAvoidingView, Platform, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { useDebouncedCallback } from 'use-debounce';

type MyComponentProps<T> = {
    title: string;
    searchLabel?: string;
    showModal: boolean;
    isError?: boolean;
    isLoading?: boolean;
    disableNoInternetContent?: boolean;
    handleGoBack?: () => void;
    onShowModal: (open: boolean) => void;
    onSearch?: (text: string) => void;
    renderTopItem?: () => React.ReactElement;
    data: (T & { id: any })[];
    renderItem: ({ item }: { item: T }) => React.ReactElement;
    onConfirm?: () => void;
    onConfirmInput?: () => void;
    searchRef?: any;
    debounceTime?: number;
    placeholder?: string;
    loadingRef?: React.RefObject<ILoadingRef>;
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
    loadingRef,
    disableNoInternetContent,
}: MyComponentProps<T>) => {
    const handleSearchChange = useDebouncedCallback(
        (value: string) => {
            console.log('[SSearchModal] Debounced onSearch called with:', JSON.stringify(value));
            onSearch?.(value);
        },
        debounceTime,
        { leading: false, trailing: true },
    );

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
                            {onSearch && (
                                <SFormControl>
                                    {searchLabel && <SFormControl.Label>{searchLabel}</SFormControl.Label>}
                                    <SInput
                                        ref={searchRef}
                                        inputProps={{
                                            placeholder: placeholder,
                                            onChangeText: (v: string) => {
                                                console.log(
                                                    '[SSearchModal] onChangeText called with:',
                                                    JSON.stringify(v),
                                                );
                                                handleSearchChange(v);
                                                if (searchRef?.current) {
                                                    searchRef.current.value = v;
                                                }
                                            },
                                            ...(onConfirmInput && {
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
                                            }),
                                        }}
                                    />
                                </SFormControl>
                            )}
                            <SLoadContainer controledIsLoading={isLoading} loadingRef={loadingRef}>
                                <SErrorBox showError={isError}>
                                    <SNoInternet skipNetInfo={disableNoInternetContent}>
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
                            </SLoadContainer>
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
