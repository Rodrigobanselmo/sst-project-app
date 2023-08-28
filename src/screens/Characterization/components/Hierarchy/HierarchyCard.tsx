import { SBox, SText, SVStack } from '@components/core';
import { SRowCard } from '@components/modelucules/SRowCard';
import { STagHierarchy } from '@components/modelucules/STagHierarchy/STagHierarchy';
import { STagRisk } from '@components/modelucules/STagRisk/STagRisk';
import { riskMap } from '@constants/maps/risk.map';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import withObservables from '@nozbe/with-observables';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { HierarchyListParents } from '@utils/helpers/hierarchyListParents';
import { useState } from 'react';

type Props = {
    hierarchy: HierarchyListParents & { selected?: boolean };
    handleClickRisk?: (risk: HierarchyListParents) => Promise<void>;
    selected?: boolean;
    renderRightElement?: (risk: HierarchyListParents, selected: boolean) => React.ReactElement;
};

export function HierarchyCard({ hierarchy, selected, handleClickRisk, renderRightElement }: Props): React.ReactElement {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = () => {
        if (handleClickRisk) {
            setIsLoading(true);
            handleClickRisk(hierarchy).finally(() => setIsLoading(false));
        }
    };

    return (
        <SRowCard loading={isLoading} selected={selected} onPress={handleClick}>
            <SVStack>
                <STagHierarchy hierarchy={hierarchy} />
                <SText flex={1} fontSize={14}>
                    {hierarchy?.parentsName.join(' > ')}
                </SText>
            </SVStack>
            {renderRightElement?.(hierarchy, !!selected)}
        </SRowCard>
    );
}

const enhance = withObservables(['risk'], ({ risk }) => {
    return { risk };
});

const EnhancedRiskCard = enhance(HierarchyCard);
export default EnhancedRiskCard;
