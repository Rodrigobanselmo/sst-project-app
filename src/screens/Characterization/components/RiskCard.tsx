import { SBox, SText } from '@components/core';
import { SRowCard } from '@components/modelucules/SRowCard';
import { STagRisk } from '@components/modelucules/STagRisk/STagRisk';
import { riskMap } from '@constants/maps/risk.map';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import withObservables from '@nozbe/with-observables';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';

type Props = {
    risk: RiskModel;
};

export function RiskCard({ risk }: Props): React.ReactElement {
    const { navigate } = useNavigation<AppNavigatorRoutesProps>();

    const handleEditRisk = () => {
        // navigate('risk', {
        //     id: risk.id,
        //     workspaceId: risk.workspaceId,
        // });
    };

    return (
        <SRowCard onPress={handleEditRisk}>
            <STagRisk risk={risk} />
        </SRowCard>
    );
}

const enhance = withObservables(['risk'], ({ risk }) => {
    return { risk };
});

const EnhancedRiskCard = enhance(RiskCard);
export default EnhancedRiskCard;
