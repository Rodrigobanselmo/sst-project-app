import { SBox, SFormControl, SHStack, SSpinner, SText } from '@components/core';
import { SButton, SInput } from '@components/modelucules';
import { SModal } from '@components/organisms/SModal';
import { SAFE_AREA_PADDING, SCREEN_HEIGHT } from '@constants/constants';
import { Center } from 'native-base';
import { useEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { useDebouncedCallback } from 'use-debounce';

type MyComponentProps = {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
};

export const SFullPageModal = ({ open, onClose, children }: MyComponentProps) => {
    return (
        <SModal isOpen={open} height={'100%'} onClose={() => onClose()} size="full">
            <SModal.Content
                h={'100%'}
                maxH={'100%'}
                pt={SAFE_AREA_PADDING.paddingTop}
                pb={SAFE_AREA_PADDING.paddingBottom}
            >
                {children}
            </SModal.Content>
        </SModal>
    );
};
