import { SSpinner, SVStack } from '@components/core';
import React from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { CharacterizationFormProps } from '../../types';
// import * as ImagePicker from 'expo-image-picker';
import { SButton, SInputSearch } from '@components/index';
import { SHorizontalMenu } from '@components/modelucules/SHorizontalMenu';
import { SAFE_AREA_PADDING, pagePadding } from '@constants/constants';
import { HierarchyEnum } from '@constants/enums/hierarchy.enum';
import { riskOptionsList } from '@constants/maps/risk-options.map';
import { useGetHierarchyDatabase } from '@hooks/useGetHierarchyDatabase';
import { useTableSearch } from '@hooks/useTableSearch';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import sortArray from 'sort-array';
import { HierarchyList } from './HierarchyList';
import { hierarchyList } from '@constants/maps/hierarchy.map';
import { HierarchyListParents, hierarchyListParents } from '@utils/helpers/hierarchyListParents';
import { usePersistedStateHierarchy } from '@services/api/sync/getHierarchySync';

type PageProps = {
    form: CharacterizationFormProps;
    onEditForm: (form: Partial<CharacterizationFormProps>) => void;
    onSaveForm: () => Promise<void>;
    isEdit?: boolean;
    onClick?: (risk: HierarchyListParents) => Promise<void>;
    renderRightElement?: (risk: HierarchyListParents, selected: boolean) => React.ReactElement;
};

export function HierarchyTable({ onClick, renderRightElement, form, onSaveForm }: PageProps): React.ReactElement {
    const [search, setSearch] = React.useState<string>('');
    const inputRef = React.useRef<any>(null);
    const hierarchyIds = React.useMemo(() => {
        return form.hierarchies?.map((h) => h.id) || [];
    }, [form]);

    const { isLoading: isL1, hierarchies, setIsLoading } = useGetHierarchyDatabase({ workspaceId: form.workspaceId });

    const hierarchiesParents = React.useMemo(() => {
        const data = hierarchyListParents(hierarchies);

        return data;
    }, [hierarchies]);

    const hierarchySelected = React.useMemo(
        () => hierarchiesParents.hierarchies.filter((h) => hierarchyIds.includes(h.id)),
        [hierarchiesParents, hierarchyIds],
    );
    const isLoading = isL1;

    const [activeType, setActiveType] = React.useState<HierarchyEnum | null>(null);

    const filteredData = React.useMemo(() => {
        const hierarchyData = search ? hierarchiesParents.hierarchies : hierarchySelected;

        if (!hierarchyData) return [];
        if (!activeType) return hierarchyData;

        return hierarchyData?.filter((h) => h.type === activeType);
    }, [search, hierarchiesParents, hierarchySelected, activeType]);

    const { handleSearchChange, results } = useTableSearch({
        data: filteredData,
        searchValue: search,
        setSearchValue: setSearch,
        onLoadingSearchFn: setIsLoading,
        keys: ['name'],
        threshold: 0.7,
        rowsPerPage: 30,
        sortFunction: (array) =>
            sortArray(array, {
                by: ['name'],
                order: ['asc'],
            }),
    });

    const handleClick = async (hierarchy: HierarchyListParents) => {
        if (onClick) await onClick(hierarchy);
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
                            onChange={(value) => setActiveType(value.value)}
                            options={[
                                { value: null as any, name: 'Todos' },
                                ...hierarchyList.filter((h) => hierarchiesParents.types.includes(h.value)),
                            ]}
                            getKeyExtractor={(item) => item.value}
                            getLabel={(item) => item.name}
                            getIsActive={(item) => item.value === activeType}
                        />

                        {isLoading && <SSpinner color={'primary.main'} size={32} />}
                        {!isLoading && results.length > 0 && (
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
                <SButton size={'sm'} title="Salvar" onPress={onSaveForm} />
            </SVStack>
        </>
    );
}
