import { SBox, SText, SVStack } from '@components/core';
import { SRowCard } from '@components/modelucules/SRowCard';
import { STagHierarchy } from '@components/modelucules/STagHierarchy/STagHierarchy';
import { STagRisk } from '@components/modelucules/STagRisk/STagRisk';
import { hierarchyConstant } from '@constants/maps/hierarchy.map';
import { riskMap } from '@constants/maps/risk.map';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import withObservables from '@nozbe/with-observables';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { HierarchyListParents } from '@utils/helpers/hierarchyListParents';
import { useState } from 'react';

type Props = {
    hierarchy: HierarchyListParents & { selected?: boolean };
    onClick?: (risk: HierarchyListParents) => Promise<void>;
    selected?: boolean;
    renderRightElement?: (risk: HierarchyListParents, selected: boolean) => React.ReactElement;
};

export function HierarchyCard({ hierarchy, selected, onClick, renderRightElement }: Props): React.ReactElement {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = () => {
        if (onClick) {
            setIsLoading(true);
            onClick(hierarchy).finally(() => setIsLoading(false));
        }
    };

    const parents = hierarchy?.parents.map((h) => `${hierarchyConstant[h.type]?.short || ''}: ${h.name}`).join(' > ');

    return (
        <SRowCard loading={isLoading} selected={selected} onPress={handleClick}>
            <SVStack flex={1}>
                <STagHierarchy type={hierarchy.type} name={hierarchy.name} />
                {parents && (
                    <SText flex={1} fontSize={11} mt={1}>
                        {parents}
                    </SText>
                )}
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
