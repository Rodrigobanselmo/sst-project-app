import { SFlatList } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import { SNoContent } from '@components/modelucules';
import { pagePaddingPx } from '@constants/constants';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { withObservables } from '@nozbe/watermelondb/react';
import { checkArrayEqual } from '@utils/helpers/checkArrayEqual';
import { memo } from 'react';
import { RiskCard } from './RiskCard';

type Props = {
    risks?: RiskModel[];
    selectedIds?: string[];
    onClickRisk?: (risk: RiskModel) => Promise<void>;
    renderRightElement?: (risk: RiskModel, selected: boolean) => React.ReactElement;
};

export const RiskList = memo(
    ({ risks, onClickRisk, selectedIds, renderRightElement }: Props) => {
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
