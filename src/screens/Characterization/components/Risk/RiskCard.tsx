import { SBox, SText } from '@components/core';
import { SRowCard } from '@components/modelucules/SRowCard';
import { STagRisk } from '@components/modelucules/STagRisk/STagRisk';
import { riskMap } from '@constants/maps/risk.map';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import withObservables from '@nozbe/with-observables';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { useState } from 'react';

type Props = {
    risk: RiskModel & { selected?: boolean };
    handleClickRisk?: (risk: RiskModel) => Promise<void>;
    selected?: boolean;
    renderRightElement?: (risk: RiskModel, selected: boolean) => React.ReactElement;
};

export function RiskCard({ risk, selected, handleClickRisk, renderRightElement }: Props): React.ReactElement {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = () => {
        if (handleClickRisk) {
            setIsLoading(true);
            handleClickRisk(risk).finally(() => setIsLoading(false));
        }
    };

    return (
        <SRowCard loading={isLoading} selected={selected} onPress={handleClick}>
            <STagRisk risk={risk} />
            {renderRightElement?.(risk, !!selected)}
        </SRowCard>
    );
}

const enhance = withObservables(['risk'], ({ risk }) => {
    return { risk };
});

const EnhancedRiskCard = enhance(RiskCard);
export default EnhancedRiskCard;
