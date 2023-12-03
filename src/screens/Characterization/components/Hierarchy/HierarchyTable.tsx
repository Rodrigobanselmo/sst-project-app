import { SSpinner, SVStack } from '@components/core';
import React, { useCallback } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { CharacterizationFormProps } from '../../types';
// import * as ImagePicker from 'expo-image-picker';
import { SButton, SInputSearch } from '@components/index';
import { SHorizontalMenu } from '@components/modelucules/SHorizontalMenu';
import { SAFE_AREA_PADDING, pagePadding } from '@constants/constants';
import { HierarchyEnum } from '@constants/enums/hierarchy.enum';
import { riskOptionsList } from '@constants/maps/risk-options.map';
import { useGetHierarchyDatabase } from '@hooks/database/useGetHierarchyDatabase';
import { useTableSearch } from '@hooks/useTableSearchOld';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import sortArray from 'sort-array';
import { HierarchyList } from './HierarchyList';
import { hierarchyList } from '@constants/maps/hierarchy.map';
import { HierarchyListParents, hierarchyListParents } from '@utils/helpers/hierarchyListParents';
import { usePersistedStateHierarchy } from '@services/api/sync/getHierarchySync';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';
import { SInputLoadingSearch } from '@components/modelucules/SInputSearch/SInputLoadingSearch';
import { useResultSearch } from '@hooks/useResultSearch';

type PageProps = {
    onSave: () => Promise<void>;
    onClick?: (risk: HierarchyListParents) => Promise<void>;
    renderRightElement?: (risk: HierarchyListParents, selected: boolean) => React.ReactElement;
};

export function HierarchyTable({ onClick, renderRightElement, onSave }: PageProps): React.ReactElement {
    const [search, setSearch] = React.useState<string>('');
    const [activeType, setActiveType] = React.useState<HierarchyEnum | null>(null);
    const inputRef = React.useRef<any>(null);

    const hierarchyIds = useCharacterizationFormStore((state) => state.form?.hierarchies?.map((h) => h.id));
    const workspaceId = useCharacterizationFormStore((state) => state.form.workspaceId);

    const { isLoading, hierarchies } = useGetHierarchyDatabase({ workspaceId });

    const filterActiveType = (data: HierarchyListParents[], activeType: HierarchyEnum | null) => {
        if (!data) return [];
        if (!activeType) return data;

        return data?.filter((item) => item.type === activeType);
    };

    const data = React.useMemo(() => {
        const hierarchiesData = hierarchyListParents(hierarchies || []);
        let hierarchiesList = hierarchiesData.hierarchies;

        if (!search) {
            hierarchiesList = hierarchiesList.filter((h) => hierarchyIds?.includes(h.id));
        }

        const hierarchyFiltered = filterActiveType(hierarchiesList || [], activeType);

        return {
            hierarchyFiltered,
            typeOptions: hierarchyList.filter((h) => hierarchiesData.types.includes(h.value)),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hierarchies, search, activeType]);

    const { results } = useResultSearch({
        data: data.hierarchyFiltered,
        search,
        keys: ['name'],
        threshold: 0.7,
        rowsPerPage: 15,
        sortFunction: (array) =>
            sortArray(array, {
                by: ['name'],
                order: ['asc'],
            }),
    });

    const handleClick = useCallback(
        async (hierarchy: HierarchyListParents) => {
            if (onClick) await onClick(hierarchy);
        },
        [onClick],
    );

    console.log('hierarchy form');
    return (
        <>
            <KeyboardAvoidingView
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
                style={{ flex: 1, paddingBottom: 10 }}
                behavior="padding"
            >
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <SVStack flex={1} mt={4}>
                        <SInputLoadingSearch ref={inputRef} mb={-1} mx={'pagePaddingPx'} onSearchChange={setSearch} />
                        <SHorizontalMenu
                            mb={4}
                            onChange={(value) => setActiveType(value.value)}
                            options={[{ value: null as any, name: 'Todos' }, ...data.typeOptions]}
                            getKeyExtractor={(item) => item.value}
                            getLabel={(item) => item.name}
                            getIsActive={(item) => item.value === activeType}
                        />

                        {isLoading && <SSpinner color={'primary.main'} size={32} />}
                        {!isLoading && (
                            <HierarchyList
                                renderRightElement={renderRightElement}
                                onClick={handleClick}
                                hierarchies={results}
                                selectedIds={hierarchyIds}
                            />
                        )}
                    </SVStack>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
            <SVStack mb={SAFE_AREA_PADDING.paddingBottom} mt={5} mx={pagePadding}>
                <SButton size={'sm'} title="Salvar" onPress={onSave} />
            </SVStack>
        </>
    );
}
