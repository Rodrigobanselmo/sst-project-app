import { formatCPF } from '@brazilian-utils/brazilian-utils';
import { SHStack, SText, SVStack } from '@components/core';
import { SRowCard } from '@components/modelucules/SRowCard';
import { hierarchyConstant } from '@constants/maps/hierarchy.map';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import { withObservables } from '@nozbe/watermelondb/react';
import { HierarchyListParents } from '@utils/helpers/hierarchyListParents';
import { memo, useState } from 'react';

type Props = {
    hierarchy?: HierarchyListParents;
    employee: EmployeeModel & { selected?: boolean };
    onClick?: (risk: EmployeeModel) => Promise<void>;
    selected?: boolean;
    renderRightElement?: (risk: EmployeeModel, selected: boolean) => React.ReactElement;
};

export const EmployeeCard = memo(
    ({ employee, selected, hierarchy, onClick, renderRightElement }: Props) => {
        const [isLoading, setIsLoading] = useState(false);

        const handleClick = () => {
            if (onClick) {
                setIsLoading(true);
                onClick(employee).finally(() => setIsLoading(false));
            }
        };

        const parents = hierarchy
            ? [...(hierarchy?.parents || []), hierarchy]
                  .map((h) => `${hierarchyConstant[h.type]?.short || ''}: ${h.name}`)
                  .join(' > ')
            : 'sem cargo';

        return (
            <SRowCard loading={isLoading} selected={selected} onPress={handleClick}>
                <SVStack flex={1}>
                    <SText flex={1} fontSize={13}>
                        {employee.socialName || employee.name}
                    </SText>
                    <SHStack flex={1} mt={1}>
                        <SText fontSize={11} mr={3}>
                            CPF: {formatCPF(employee.cpf)}
                        </SText>
                        <SText fontSize={11}>RG: {employee.rg}</SText>
                    </SHStack>
                    <SHStack flex={1} mt={-1}>
                        {parents && (
                            <SText flex={1} fontSize={11} mt={1}>
                                {parents}
                            </SText>
                        )}
                    </SHStack>
                </SVStack>
                {renderRightElement?.(employee, !!selected)}
            </SRowCard>
        );
    },
    (prevProps, nextProps) => {
        if (prevProps.selected != nextProps.selected) return false;
        if (prevProps.employee.id != nextProps.employee.id) return false;
        return true;
    },
);

const enhance = withObservables(['employee'], ({ employee }) => {
    return { employee };
});

const EnhancedRiskCard = enhance(EmployeeCard);
export default EnhancedRiskCard;
