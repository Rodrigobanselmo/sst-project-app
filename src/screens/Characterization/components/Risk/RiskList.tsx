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
import EnhancedRiskCard, { RiskCard } from './RiskCard';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { RiskEnum } from '@constants/enums/risk.enum';
import { riskOptionsList } from '@constants/maps/risk-options.map';

type Props = {
    risks?: RiskModel[];
    selectedIds?: string[];
    user?: UserAuthModel;
    onClickRisk?: (risk: RiskModel) => Promise<void>;
    renderRightElement?: (risk: RiskModel, selected: boolean) => React.ReactElement;
};

export function RiskList({ risks, onClickRisk, selectedIds, renderRightElement }: Props): React.ReactElement {
    return (
        <>
            {!!risks?.length && (
                <SFlatList
                    data={risks || []}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps={'handled'}
                    renderItem={({ item }) => (
                        <RiskCard
                            renderRightElement={renderRightElement}
                            handleClickRisk={onClickRisk}
                            risk={item}
                            selected={selectedIds?.includes(item.id)}
                        />
                    )}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: pagePaddingPx }}
                />
            )}
            {!risks?.length && <SNoContent mx="pagePaddingPx" />}
        </>
    );
}

const enhance = withObservables(['user'], ({ user }) => {
    let risks: any;

    try {
        risks = user.risks;
    } catch (error) {
        risks = undefined;
    }

    return {
        ...(risks && { risks }),
        user,
    };
});

const EnhancedRiskList = enhance(RiskList);

export function RenderEnhancedRiskList({
    user,
    onClickRisk,
}: {
    user?: UserAuthModel;
    onClickRisk?: (risk: RiskModel) => void;
}) {
    try {
        if (user) return <EnhancedRiskList onClickRisk={onClickRisk} user={user} />;
        return null;
    } catch (e) {
        return null;
    }
}

export default RenderEnhancedRiskList;
