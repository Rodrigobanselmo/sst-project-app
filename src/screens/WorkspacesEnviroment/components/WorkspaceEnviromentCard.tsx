import { formatCNPJ } from '@brazilian-utils/brazilian-utils';
import { SBox, SHStack, SText } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import { SRowCard } from '@components/modelucules/SRowCard';
import { characterizationMap } from '@constants/maps/characterization.map';
import { useAuth } from '@hooks/useAuth';
import { CompanyModel } from '@libs/watermelon/model/CompanyModel';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import withObservables from '@nozbe/with-observables';
import { useNavigation } from '@react-navigation/native';
import { CompanyRepository } from '@repositories/companyRepository';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { addDotsText } from '@utils/helpers/addDotsText';
import { formatDateToDDMMYY } from '@utils/helpers/dateFormat';

type Props = {
    workspace: WorkspaceModel;
    company: CompanyModel;
};

export function WorkspaceEnviromentCard({ workspace, company }: Props): React.ReactElement {
    const { navigate } = useNavigation<AppNavigatorRoutesProps>();

    const handleEditWorkspaceEnviroment = async () => {
        navigate('characterizations', { workspaceId: workspace.id });
    };

    return (
        <SRowCard onPress={handleEditWorkspaceEnviroment}>
            <SBox flex={1}>
                <SHStack justifyContent={'space-between'} alignItems={'center'}>
                    <SText>{addDotsText({ text: company.fantasy || company.name, maxLength: 20 })}</SText>
                    <SText fontSize={15} color={'blue.900'} opacity={0.5}>
                        iniciado em {formatDateToDDMMYY(workspace.startChar_at)}
                    </SText>
                </SHStack>
                <SHStack justifyContent={'space-between'}>
                    <SText fontSize={12} color="text.light">
                        {addDotsText({ text: workspace.name, maxLength: 25 })}
                    </SText>
                    <SText fontSize={12} color="text.light">
                        {formatCNPJ(company.cnpj || '')}
                    </SText>
                </SHStack>
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
