import { SSpinner, SVStack } from '@components/core';
import React, { useCallback } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
import { SButton } from '@components/index';
import { SInputLoadingSearch } from '@components/modelucules/SInputSearch/SInputLoadingSearch';
import { SAFE_AREA_PADDING, pagePadding } from '@constants/constants';
import { useGetEmployee } from '@hooks/database/useGetEmployee';
import { useResultSearch } from '@hooks/useResultSearch';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import sortArray from 'sort-array';
import { EmployeeList } from './EmployeeList';

type PageProps = {
    onSave: () => Promise<void>;
    onClick?: (employee: EmployeeModel) => Promise<void>;
    renderRightElement?: (employee: EmployeeModel, selected: boolean) => React.ReactElement;
};

export function EmployeesTable({ onClick, renderRightElement, onSave }: PageProps): React.ReactElement {
    const [search, setSearch] = React.useState<string>('');
    const inputRef = React.useRef<any>(null);

    const employeeIds = useCharacterizationFormStore((state) => state.form?.employees?.map((e) => e.id));
    const workspaceId = useCharacterizationFormStore((state) => state.form.workspaceId);

    const { isLoading, employees } = useGetEmployee({ workspaceId });

    const data = React.useMemo(() => {
        let employeesList = employees || [];

        if (!search) {
            employeesList = employeesList.filter((h) => employeeIds?.includes(h.id));
        }

        return employeesList;
    }, [employees, search, employeeIds]);

    const { results } = useResultSearch({
        data,
        search,
        keys: ['name', 'cpf', 'rg', 'socialName'],
        threshold: 0.8,
        rowsPerPage: 20,
        sortFunction: (array) =>
            sortArray(array, {
                by: ['name'],
                order: ['asc'],
            }),
    });

    const handleClick = useCallback(
        async (employee: EmployeeModel) => {
            if (onClick) await onClick(employee);
        },
        [onClick],
    );

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
                        {isLoading && <SSpinner color={'primary.main'} size={32} />}
                        {!isLoading && (
                            <EmployeeList
                                renderRightElement={renderRightElement}
                                onClick={handleClick}
                                employees={results}
                                selectedIds={employeeIds}
                                workspaceId={workspaceId}
                            />
                        )}
                    </SVStack>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
            <SVStack mb={SAFE_AREA_PADDING.paddingBottom} mt={0} mx={pagePadding}>
                <SButton size={'sm'} title="Salvar" onPress={onSave} />
            </SVStack>
        </>
    );
}
