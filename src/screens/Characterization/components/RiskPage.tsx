import { SBox, SCenter, SFlatList, SHStack, SScrollView, SSpinner, SText, SVStack } from '@components/core';
import React from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { CharacterizationFormProps } from '../types';
// import * as ImagePicker from 'expo-image-picker';
import PhotoEditor from '@baronha/react-native-photo-editor';
import { SButton, SInput, SInputArea, SScreenHeader } from '@components/index';
import { SLabel } from '@components/modelucules/SLabel';
import { SRadio } from '@components/modelucules/SRadio';
import { SAFE_AREA_PADDING, SCREEN_WIDTH, pagePadding, pagePaddingPx } from '@constants/constants';
import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { characterizationMap } from '@constants/maps/characterization.map';
import { deleteImageToGallery } from '@utils/helpers/saveImage';
import * as ImagePickerExpo from 'expo-image-picker';
import { Orientation } from 'expo-screen-orientation';
import { Control, Controller } from 'react-hook-form';
import ImagePicker from 'react-native-image-crop-picker';
import { ICharacterizationValues } from '../schemas';
import { PhotoComponent } from './PhotoComponent';
import RenderEnhancedRiskList from './RiskList';
import { useUserDatabase } from '@hooks/useUserDatabase';

type PageProps = {
    form: CharacterizationFormProps;
    onEditForm: (form: Partial<CharacterizationFormProps>) => void;
    onSaveForm: () => Promise<void>;
    isEdit?: boolean;
};

export function RiskPage({ onEditForm, onSaveForm, form, isEdit }: PageProps): React.ReactElement {
    const { user, isLoading, setIsLoading, userDatabase } = useUserDatabase();

    return (
        <SVStack flex={1} mt={4}>
            {isLoading && <SSpinner color={'primary.main'} size={32} />}
            {userDatabase && <RenderEnhancedRiskList user={userDatabase} />}
        </SVStack>
    );
}
