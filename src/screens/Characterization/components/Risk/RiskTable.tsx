import { SSpinner, SVStack } from '@components/core';
import React, { useCallback } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { CharacterizationFormProps } from '../../types';
// import * as ImagePicker from 'expo-image-picker';
import { SButton, SInputSearch } from '@components/index';
import { SHorizontalMenu } from '@components/modelucules/SHorizontalMenu';
import { SAFE_AREA_PADDING, pagePadding } from '@constants/constants';
import { RiskEnum } from '@constants/enums/risk.enum';
import { riskOptionsList } from '@constants/maps/risk-options.map';
import { useGetRisksDatabase } from '@hooks/database/useGetRisksDatabase';
import { useTableSearch } from '@hooks/useTableSearchOld';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import sortArray from 'sort-array';
import { RiskList } from './RiskList';
import { SInputLoadingSearch } from '@components/modelucules/SInputSearch/SInputLoadingSearch';
import { useResultSearch } from '@hooks/useResultSearch';

type PageProps = {
    riskIds?: string[];
    onSaveForm?: () => Promise<void>;
    onClickRisk?: (risk: RiskModel) => Promise<void>;
    renderRightElement?: (risk: RiskModel, selected: boolean) => React.ReactElement;
};

export function RiskTable({ onClickRisk, renderRightElement, riskIds, onSaveForm }: PageProps): React.ReactElement {
    const [search, setSearch] = React.useState<string>('');
    const inputRef = React.useRef<any>(null);

    const { isLoading, risks: risksAll } = useGetRisksDatabase({});
    const [activeType, setActiveType] = React.useState<RiskEnum | null>(null);

    const filterRisks = (risks: RiskModel[], activeType: RiskEnum | null) => {
        if (!risks) return [];
        if (!activeType) return risks;

        return risks?.filter((characterization) => characterization.type === activeType);
    };

    const risks = React.useMemo(() => {
        let risks = risksAll || [];
        if (!search) {
            risks = risks?.filter((risk) => riskIds?.includes(risk.id));
        }
        return filterRisks(risks || [], activeType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [risksAll, search, activeType]);

    const { results } = useResultSearch({
        data: risks,
        search,
        keys: ['name'],
        rowsPerPage: 10,
        sortFunction: (array) =>
            sortArray(array, {
                by: ['name'],
                order: ['asc'],
            }),
    });

    const handleClickRisk = useCallback(
        async (risk: RiskModel) => {
            if (onClickRisk) await onClickRisk(risk);
        },
        [onClickRisk],
    );

    console.log('risk form');
    return (
        <>
            <KeyboardAvoidingView
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
                style={{ flex: 1, paddingBottom: 10 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <SVStack flex={1} mt={4}>
                        <SInputLoadingSearch ref={inputRef} mb={-1} mx={'pagePaddingPx'} onSearchChange={setSearch} />
                        <SHorizontalMenu
                            mb={4}
                            onChange={(value) => setActiveType(value.type)}
                            options={riskOptionsList}
                            getKeyExtractor={(item) => item.value}
                            getLabel={(item) => item.label}
                            getIsActive={(item) => item.type === activeType}
                        />

                        {isLoading && <SSpinner color={'primary.main'} size={32} />}
                        {!isLoading && (
                            <RiskList
                                renderRightElement={renderRightElement}
                                onClickRisk={handleClickRisk}
                                risks={results}
                            />
                        )}
                    </SVStack>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
            {onSaveForm && (
                <SVStack mb={SAFE_AREA_PADDING.paddingBottom} mt={5} mx={pagePadding}>
                    <SButton size={'sm'} title="Salvar" onPress={onSaveForm} />
                </SVStack>
            )}
        </>
    );
}
