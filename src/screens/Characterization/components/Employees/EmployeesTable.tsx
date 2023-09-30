import { SSpinner, SVStack } from '@components/core';
import React from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { CharacterizationFormProps } from '../../types';
// import * as ImagePicker from 'expo-image-picker';
import { SButton, SInputSearch } from '@components/index';
import { SAFE_AREA_PADDING, pagePadding } from '@constants/constants';
import { HierarchyEnum } from '@constants/enums/hierarchy.enum';
import { useGetEmployee } from '@hooks/database/useGetEmployee';
import { useTableSearch } from '@hooks/useTableSearch';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import sortArray from 'sort-array';
import { EmployeeList } from './EmployeeList';

type PageProps = {
    form: CharacterizationFormProps;
    onEditForm: (form: Partial<CharacterizationFormProps>) => void;
    onSaveForm: () => Promise<void>;
    isEdit?: boolean;
    onClick?: (employee: EmployeeModel) => Promise<void>;
    renderRightElement?: (employee: EmployeeModel, selected: boolean) => React.ReactElement;
};

export function EmployeesTable({ onClick, renderRightElement, form, onSaveForm }: PageProps): React.ReactElement {
    const [search, setSearch] = React.useState<string>('');
    const inputRef = React.useRef<any>(null);

    const employeeIds = React.useMemo(() => {
        return form.employees?.map((h) => h.id) || [];
    }, [form]);

    const { isLoading: isL1, employees, setIsLoading } = useGetEmployee({ workspaceId: form.workspaceId });
    const { isLoading: isL2, employees: employeesSelected } = useGetEmployee({ ids: employeeIds });

    const isLoading = isL1 || isL2;

    const filteredData = React.useMemo(() => {
        const hierarchyData = search ? employees : employeesSelected;

        if (!hierarchyData) return [];
        return hierarchyData;
    }, [search, employees, employeesSelected]);

    const { handleSearchChange, results } = useTableSearch({
        data: filteredData,
        searchValue: search,
        setSearchValue: setSearch,
        onLoadingSearchFn: setIsLoading,
        keys: ['name', 'cpf', 'rg', 'socialName'],
        threshold: 0.8,
        rowsPerPage: 30,
        sortFunction: (array) =>
            sortArray(array, {
                by: ['name'],
                order: ['asc'],
            }),
    });

    const handleClick = async (employee: EmployeeModel) => {
        if (onClick) await onClick(employee);
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

                        {isLoading && <SSpinner color={'primary.main'} size={32} />}
                        {!isLoading && results.length > 0 && (
                            <EmployeeList
                                renderRightElement={renderRightElement}
                                onClick={handleClick}
                                employees={results}
                                selectedIds={employeeIds}
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
