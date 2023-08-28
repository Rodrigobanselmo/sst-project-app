import { SBox, SCenter, SFlatList, SHStack, SScrollView, SSpinner, SText, SVStack } from '@components/core';
import React from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import { CharacterizationFormProps } from '../../types';
// import * as ImagePicker from 'expo-image-picker';
import PhotoEditor from '@baronha/react-native-photo-editor';
import { SButton, SInput, SInputArea, SInputSearch, SScreenHeader } from '@components/index';
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
import { ICharacterizationValues } from '../../schemas';
import { PhotoComponent } from '../Characterization/PhotoComponent';
import RenderEnhancedRiskList, { RiskList } from './RiskList';
import { useUserDatabase } from '@hooks/useUserDatabase';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { useGetRisksDatabase } from '@hooks/useGetRisksDatabase';
import sortArray from 'sort-array';
import { useTableSearch } from '@hooks/useTableSearch';
import { RiskEnum } from '@constants/enums/risk.enum';
import { SHorizontalMenu } from '@components/modelucules/SHorizontalMenu';
import { riskOptionsList } from '@constants/maps/risk-options.map';
import { useFocusEffect } from '@react-navigation/native';

type PageProps = {
    form: CharacterizationFormProps;
    onEditForm: (form: Partial<CharacterizationFormProps>) => void;
    onSaveForm: () => Promise<void>;
    isEdit?: boolean;
    onClickRisk?: (risk: RiskModel) => Promise<void>;
    renderRightElement?: (risk: RiskModel, selected: boolean) => React.ReactElement;
};

export function RiskTable({ onClickRisk, renderRightElement, form, onSaveForm }: PageProps): React.ReactElement {
    const [search, setSearch] = React.useState<string>('');
    const inputRef = React.useRef<any>(null);
    const riskIds = React.useMemo(() => {
        return form.riskData?.map((risk) => risk.riskId) || [];
    }, [form]);

    const { isLoading: isL1, risks: risksAll, setIsLoading } = useGetRisksDatabase({});
    const { isLoading: isL2, risks: risksSelected } = useGetRisksDatabase({
        riskIds,
    });

    const isLoading = isL1 || isL2;

    const [activeType, setActiveType] = React.useState<RiskEnum | null>(null);

    const risksFiltered = React.useMemo(() => {
        const risks = search ? risksAll : risksSelected;

        if (!risks) return [];
        if (!activeType) return risks;

        return risks?.filter((characterization) => characterization.type === activeType);
    }, [search, risksAll, risksSelected, activeType]);

    const { handleSearchChange, results } = useTableSearch({
        data: risksFiltered,
        searchValue: search,
        setSearchValue: setSearch,
        onLoadingSearchFn: setIsLoading,
        keys: ['name'],
        rowsPerPage: 30,
        sortFunction: (array) =>
            sortArray(array, {
                by: ['name'],
                order: ['asc'],
            }),
    });

    const handleClickRisk = async (risk: RiskModel) => {
        if (onClickRisk) await onClickRisk(risk);
    };

    return (
        <>
            <KeyboardAvoidingView
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
                style={{ flex: 1, paddingBottom: 10 }}
                behavior="padding"
            >
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <SVStack flex={1} mt={4}>
                        <SInputSearch
                            clearButtonAction={() => setSearch('')}
                            ref={inputRef}
                            mb={-1}
                            mx={'pagePaddingPx'}
                            onSearchChange={handleSearchChange}
                        />
                        <SHorizontalMenu
                            mb={4}
                            onChange={(value) => setActiveType(value.type)}
                            options={riskOptionsList}
                            getKeyExtractor={(item) => item.value}
                            getLabel={(item) => item.label}
                            getIsActive={(item) => item.type === activeType}
                        />

                        {isLoading && <SSpinner color={'primary.main'} size={32} />}
                        {!isLoading && results.length > 0 && (
                            <RiskList
                                renderRightElement={renderRightElement}
                                onClickRisk={handleClickRisk}
                                risks={results}
                                selectedIds={risksSelected.map((risk) => risk.id)}
                            />
                        )}
                    </SVStack>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
            <SVStack mb={SAFE_AREA_PADDING.paddingBottom} mt={5} mx={pagePadding}>
                <SButton size={'sm'} title="Salvar" onPress={onSaveForm} />
            </SVStack>
        </>
    );
}
