import { formatCPF } from '@brazilian-utils/brazilian-utils';
import { SHStack, SText, SVStack } from '@components/core';
import { SRowCard } from '@components/modelucules/SRowCard';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import { withObservables } from '@nozbe/watermelondb/react';
import { useState } from 'react';

type Props = {
    employee: EmployeeModel & { selected?: boolean };
    onClick?: (risk: EmployeeModel) => Promise<void>;
    selected?: boolean;
    renderRightElement?: (risk: EmployeeModel, selected: boolean) => React.ReactElement;
};

export function EmployeeCard({ employee, selected, onClick, renderRightElement }: Props): React.ReactElement {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = () => {
        if (onClick) {
            setIsLoading(true);
            onClick(employee).finally(() => setIsLoading(false));
        }
    };

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
            </SVStack>
            {renderRightElement?.(employee, !!selected)}
        </SRowCard>
    );
}

const enhance = withObservables(['employee'], ({ employee }) => {
    return { employee };
});

const EnhancedRiskCard = enhance(EmployeeCard);
export default EnhancedRiskCard;
