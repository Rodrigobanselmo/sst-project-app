import { SFlatList, SFloatingButton, SIcon, useSToast } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import { SInputSearch, SNoContent } from '@components/modelucules';
import { SHorizontalMenu } from '@components/modelucules/SHorizontalMenu';
import { SAFE_AREA_PADDING, pagePaddingPx } from '@constants/constants';
import { characterizationOptionsList } from '@constants/maps/characterization-options.map';
import { characterizationMap } from '@constants/maps/characterization.map';
import { MaterialIcons } from '@expo/vector-icons';
import { useTableSearch } from '@hooks/useTableSearch';
import { withObservables } from '@nozbe/watermelondb/react';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { useMemo, useState } from 'react';
import sortArray from 'sort-array';
import EnhancedRiskCard, { HierarchyCard } from './HierarchyCard';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { RiskEnum } from '@constants/enums/risk.enum';
import { riskOptionsList } from '@constants/maps/risk-options.map';
import { HierarchyListParents } from '@utils/helpers/hierarchyListParents';

type Props = {
    hierarchies?: HierarchyListParents[];
    selectedIds?: string[];
    user?: UserAuthModel;
    onClick?: (risk: HierarchyListParents) => Promise<void>;
    renderRightElement?: (risk: HierarchyListParents, selected: boolean) => React.ReactElement;
};

export function HierarchyList({ hierarchies, onClick, selectedIds, renderRightElement }: Props): React.ReactElement {
    return (
        <>
            {!!hierarchies?.length && (
                <SFlatList
                    data={hierarchies || []}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps={'handled'}
                    renderItem={({ item }) => (
                        <HierarchyCard
                            renderRightElement={renderRightElement}
                            onClick={onClick}
                            hierarchy={item}
                            selected={selectedIds?.includes(item.id)}
                        />
                    )}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: pagePaddingPx }}
                />
            )}
            {!hierarchies?.length && <SNoContent mx="pagePaddingPx" />}
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
