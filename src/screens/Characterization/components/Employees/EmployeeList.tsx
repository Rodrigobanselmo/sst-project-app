import { SFlatList } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import { SNoContent } from '@components/modelucules';
import { pagePaddingPx } from '@constants/constants';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { EmployeeCard } from './EmployeeCard';
import { memo } from 'react';
import { checkArrayEqual } from '@utils/helpers/checkArrayEqual';

type Props = {
    employees?: EmployeeModel[];
    selectedIds?: string[];
    user?: UserAuthModel;
    onClick?: (risk: EmployeeModel) => Promise<void>;
    renderRightElement?: (risk: EmployeeModel, selected: boolean) => React.ReactElement;
};

export const EmployeeList = memo(
    ({ employees, onClick, selectedIds, renderRightElement }: Props) => {
        return (
            <>
                {!!employees?.length && (
                    <SFlatList
                        data={employees || []}
                        keyExtractor={(item) => item.id}
                        keyboardShouldPersistTaps={'handled'}
                        renderItem={({ item }) => (
                            <EmployeeCard
                                renderRightElement={renderRightElement}
                                onClick={onClick}
                                employee={item}
                                selected={selectedIds?.includes(item.id)}
                            />
                        )}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: pagePaddingPx }}
                    />
                )}
                {!employees?.length && <SNoContent mx="pagePaddingPx" />}
            </>
        );
    },
    (prevProps, nextProps) => {
        if (prevProps.employees?.length == undefined) return false;
        if (
            !checkArrayEqual({
                arr1: prevProps.employees || [],
                arr2: nextProps.employees || [],
                getProperty: (r) => r.id,
            })
        )
            return false;
        if (
            !checkArrayEqual({
                arr1: prevProps.selectedIds || [],
                arr2: nextProps.selectedIds || [],
                getProperty: (id) => id,
            })
        )
            return false;

        return true;
    },
);
