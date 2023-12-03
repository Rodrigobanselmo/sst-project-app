import { SFlatList, SFloatingButton, SIcon, useSToast } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import { SInputSearch, SNoContent } from '@components/modelucules';
import { SHorizontalMenu } from '@components/modelucules/SHorizontalMenu';
import { SAFE_AREA_PADDING, pagePaddingPx } from '@constants/constants';
import { characterizationOptionsList } from '@constants/maps/characterization-options.map';
import { characterizationMap } from '@constants/maps/characterization.map';
import { MaterialIcons } from '@expo/vector-icons';
import { useTableSearch } from '@hooks/useTableSearchOld';
import { withObservables } from '@nozbe/watermelondb/react';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { memo, useMemo, useState } from 'react';
import sortArray from 'sort-array';
import EnhancedRiskCard, { RiskCard } from './RiskCard';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { RiskEnum } from '@constants/enums/risk.enum';
import { riskOptionsList } from '@constants/maps/risk-options.map';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';
import { useShallow } from 'zustand/react/shallow';
import { checkArrayEqual } from '@utils/helpers/checkArrayEqual';

type Props = {
    risks?: RiskModel[];
    onClickRisk?: (risk: RiskModel) => Promise<void>;
    renderRightElement?: (risk: RiskModel, selected: boolean) => React.ReactElement;
};

type PropsCard = {
    risk: RiskModel;
    onClickRisk?: (risk: RiskModel) => Promise<void>;
    renderRightElement?: (risk: RiskModel, selected: boolean) => React.ReactElement;
};

export const RiskCardChar = memo(({ risk, onClickRisk, renderRightElement }: PropsCard) => {
    const selected = useCharacterizationFormStore((state) => state.getIsRiskSelected(risk.id));

    return (
        <RiskCard
            renderRightElement={renderRightElement}
            handleClickRisk={onClickRisk}
            risk={risk}
            selected={selected}
        />
    );
});

export const RiskList = memo(
    ({ risks, onClickRisk, renderRightElement }: Props) => {
        return (
            <>
                {!!risks?.length && (
                    <SFlatList
                        data={risks.slice(0, 10) || []}
                        keyExtractor={(item) => item.id}
                        keyboardShouldPersistTaps={'handled'}
                        renderItem={({ item }) => (
                            <RiskCardChar
                                renderRightElement={renderRightElement}
                                onClickRisk={onClickRisk}
                                risk={item}
                            />
                        )}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: pagePaddingPx }}
                    />
                )}
                {!risks?.length && <SNoContent mx="pagePaddingPx" />}
            </>
        );
    },
    (prevProps, nextProps) => {
        if (prevProps.risks?.length == undefined) return false;
        if (
            !checkArrayEqual({
                arr1: prevProps.risks || [],
                arr2: nextProps.risks || [],
                getProperty: (r) => r.id,
            })
        )
            return false;
        return true;
    },
);

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
