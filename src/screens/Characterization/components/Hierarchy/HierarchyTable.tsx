import { SSpinner, SVStack } from '@components/core';
import React, { useCallback, useEffect } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
import { SButton } from '@components/index';
import { SHorizontalMenu } from '@components/modelucules/SHorizontalMenu';
import { SInputLoadingSearch } from '@components/modelucules/SInputSearch/SInputLoadingSearch';
import { SAFE_AREA_PADDING, pagePadding } from '@constants/constants';
import { HierarchyEnum } from '@constants/enums/hierarchy.enum';
import { hierarchyList } from '@constants/maps/hierarchy.map';
import { useGetHierarchyDatabase } from '@hooks/database/useGetHierarchyDatabase';
import { useResultSearch } from '@hooks/useResultSearch';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';
import { HierarchyListParents, hierarchyListParents } from '@utils/helpers/hierarchyListParents';
import sortArray from 'sort-array';
import { HierarchyList } from './HierarchyList';
import { useShallow } from 'zustand/react/shallow';

type PageProps = {
    onSave: () => Promise<void>;
    onClick?: (hierarchy: HierarchyListParents) => Promise<void>;
    renderRightElement?: (hierarchy: HierarchyListParents, selected: boolean) => React.ReactElement;
};

export function HierarchyTable({ onClick, renderRightElement, onSave }: PageProps): React.ReactElement {
    const [search, setSearch] = React.useState<string>('');
    const [activeType, setActiveType] = React.useState<HierarchyEnum | null>(null);
    const inputRef = React.useRef<any>(null);

    const hierarchyIds = useCharacterizationFormStore(useShallow((state) => state.form?.hierarchies?.map((h) => h.id)));
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
    }, [hierarchies, search, activeType, hierarchyIds]);

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

    useEffect(() => {
        console.log(9);
    }, [hierarchyIds]);

    console.log('hierarchy form');
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
            <SVStack mb={SAFE_AREA_PADDING.paddingBottom} mx={pagePadding}>
                <SButton size={'sm'} title="Salvar" onPress={onSave} />
            </SVStack>
        </>
    );
}
