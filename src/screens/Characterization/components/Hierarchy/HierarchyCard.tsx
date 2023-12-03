import { SBox, SText, SVStack } from '@components/core';
import { SRowCard } from '@components/modelucules/SRowCard';
import { STagHierarchy } from '@components/modelucules/STagHierarchy/STagHierarchy';
import { STagRisk } from '@components/modelucules/STagRisk/STagRisk';
import { hierarchyConstant } from '@constants/maps/hierarchy.map';
import { riskMap } from '@constants/maps/risk.map';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { withObservables } from '@nozbe/watermelondb/react';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { HierarchyListParents } from '@utils/helpers/hierarchyListParents';
import { memo, useState } from 'react';

type Props = {
    hierarchy: HierarchyListParents;
    onClick?: (risk: HierarchyListParents) => Promise<void>;
    selected?: boolean;
    renderRightElement?: (risk: HierarchyListParents, selected: boolean) => React.ReactElement;
};

export const HierarchyCard = memo(
    ({ hierarchy, selected, onClick, renderRightElement }: Props) => {
        const [isLoading, setIsLoading] = useState(false);

        const handleClick = () => {
            if (onClick) {
                setIsLoading(true);
                onClick(hierarchy).finally(() => setIsLoading(false));
            }
        };

        const parents = hierarchy?.parents
            .map((h) => `${hierarchyConstant[h.type]?.short || ''}: ${h.name}`)
            .join(' > ');

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
    },
    (prevProps, nextProps) => {
        if (prevProps.selected != nextProps.selected) return false;
        if (prevProps.hierarchy.id != nextProps.hierarchy.id) return false;
        return true;
    },
);

const enhance = withObservables(['risk'], ({ risk }) => {
    return { risk };
});

const EnhancedRiskCard = enhance(HierarchyCard);
export default EnhancedRiskCard;
