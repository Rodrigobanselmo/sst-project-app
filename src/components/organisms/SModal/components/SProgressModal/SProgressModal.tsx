import { SBox, SFormControl, SHStack, SSpinner, SText } from '@components/core';
import { SProgressBar } from '@components/core/ProgressBar';
import { SButton, SInput } from '@components/modelucules';
import { SModal } from '@components/organisms/SModal';
import { SCREEN_HEIGHT } from '@constants/constants';
import { Center } from 'native-base';
import { useEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { useDebouncedCallback } from 'use-debounce';

type MyComponentProps = {
    title: string;
    showModal: boolean;
    onShowModal: (open: boolean) => void;
    cancelButtonLabel?: string;
    onCancel?: (onClose: () => void) => void;
    progress?: number;
    bottomText?: string;
};

export const SProgressModal = ({
    showModal,
    onShowModal,
    title,
    progress = 0,
    onCancel,
    bottomText,
}: MyComponentProps) => {
    return (
        <SModal isOpen={showModal} height={SCREEN_HEIGHT} px={2} size="full">
            <Center>
                <SModal.Content h={250}>
                    <SModal.CloseButton
                        onPress={() => {
                            onCancel?.(() => onShowModal(false));
                        }}
                    />
                    <SModal.Header>
                        <SText fontSize={16}>{title}</SText>
                    </SModal.Header>

                    <Center px={3} flex={1} py={3} minW={'90%'} maxW={400} mt={-10}>
                        <Center mb={1}>
                            <SText fontSize={25}>{Math.floor(progress)}%</SText>
                        </Center>
                        <SProgressBar progress={progress} />
                        {bottomText && (
                            <Center mt={2}>
                                <SText fontSize={14} maxW={260} textAlign="center">
                                    Por favor espere enquanto sincronizamos os dados
                                </SText>
                            </Center>
                        )}
                    </Center>
                </SModal.Content>
            </Center>
        </SModal>
    );
};
