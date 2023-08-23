import { SBox, SText } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import { SRowCard } from '@components/modelucules/SRowCard';
import { characterizationMap } from '@constants/maps/characterization.map';
import { CompanyModel } from '@libs/watermelon/model/CompanyModel';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import withObservables from '@nozbe/with-observables';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';

type Props = {
    workspace: WorkspaceModel;
    company: CompanyModel;
};

export function WorkspaceEnviromentCard({ workspace, company }: Props): React.ReactElement {
    const { navigate } = useNavigation<AppNavigatorRoutesProps>();

    const handleEditWorkspaceEnviroment = () => {
        navigate('characterizations', { workspaceId: workspace.id });
    };

    return (
        <SRowCard onPress={handleEditWorkspaceEnviroment}>
            <SBox flex={1}>
                <SText>{workspace.name}</SText>
                <SText color="text.light">
                    {company.fantasy || company.name} - {company.cnpj}
                </SText>
            </SBox>
        </SRowCard>
    );
}

const enhance = withObservables(['workspace'], ({ workspace }) => {
    let company: any;

    try {
        company = workspace.Company;
    } catch (error) {
        company = undefined;
    }
    return {
        workspace,
        ...(company && { company }),
    };
});

const EnhancedWorkspaceEnviromentCard = enhance(WorkspaceEnviromentCard);
export default EnhancedWorkspaceEnviromentCard;
