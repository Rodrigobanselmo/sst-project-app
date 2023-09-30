import { SFlatList } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import { SNoContent } from '@components/modelucules';
import { pagePaddingPx } from '@constants/constants';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { EmployeeCard } from './EmployeeCard';

type Props = {
    employees?: EmployeeModel[];
    selectedIds?: string[];
    user?: UserAuthModel;
    onClick?: (risk: EmployeeModel) => Promise<void>;
    renderRightElement?: (risk: EmployeeModel, selected: boolean) => React.ReactElement;
};

export function EmployeeList({ employees, onClick, selectedIds, renderRightElement }: Props): React.ReactElement {
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
}

// const enhance = withObservables(['user'], ({ user }) => {
//     let risks: any;

//     try {
//         risks = user.risks;
//     } catch (error) {
//         risks = undefined;
//     }

//     return {
//         ...(risks && { risks }),
//         user,
//     };
// });

// const EnhancedRiskList = enhance(HierarchyList);

// export function RenderEnhancedRiskList({
//     user,
//     onClick,
// }: {
//     user?: UserAuthModel;
//     onClick?: (risk: HierarchyModel) => void;
// }) {
//     try {
//         if (user) return <EnhancedRiskList onClick={onClick} user={user} />;
//         return null;
//     } catch (e) {
//         return null;
//     }
// }

// export default RenderEnhancedRiskList;
