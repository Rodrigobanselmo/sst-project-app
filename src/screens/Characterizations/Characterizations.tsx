import { SBox, SFloatingButton, SIcon, SSpinner, SText, SVStack, useSToast } from '@components/core';
import { SButton, SScreenHeader } from '@components/index';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { useAuth } from '@hooks/useAuth';
import { database } from '@libs/watermelon';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import { useNavigation } from '@react-navigation/native';
import { CharacterizationRepository } from '@repositories/characterizationRepository';
import { CompanyRepository } from '@repositories/companyRepository';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { useCallback, useEffect, useMemo, useState } from 'react';
import RenderEnhancedCharacterizationList from './components/CharacterizationList';
import { CharacterizationsPageProps } from './types';
import { MaterialIcons } from '@expo/vector-icons';
import { SAFE_AREA_PADDING } from '@constants/constants';
import { CompanyModel } from '@libs/watermelon/model/CompanyModel';
import { addDotsText } from '@utils/helpers/addDotsText';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

export function Characterizations({ route }: CharacterizationsPageProps): React.ReactElement {
    const [workspaceDB, setWorkspaceDB] = useState<WorkspaceModel>();
    const [companyDB, setCompanyDB] = useState<CompanyModel>();
    const [loading, setLoading] = useState(true);

    const fetchCharacterizations = useCallback(async () => {
        try {
            const companyRepository = new CompanyRepository();
            const { workspace } = await companyRepository.findOneWorkspace(route.params.workspaceId);

            const company = await (workspace.Company as any).fetch();

            setCompanyDB(company);
            setWorkspaceDB(workspace);
        } catch (error) {
            console.error('fetchCharacterizations', error);
        } finally {
            setLoading(false);
        }
    }, [route.params.workspaceId]);

    useEffect(() => {
        let isMounted = true;

        if (isMounted) {
            fetchCharacterizations();
        }

        return () => {
            isMounted = false;
        };
    }, [fetchCharacterizations]);

    const companyName = companyDB?.fantasy || companyDB?.name || '';
    const workspaceName = workspaceDB?.name || '';

    return (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <SVStack flex={1}>
                <SScreenHeader
                    mb={4}
                    backButton
                    title="Ambientes / Atividades"
                    subtitleComponent={
                        <SBox px={12}>
                            {!loading && (
                                <SText fontSize={14} color="text.label">
                                    {companyName} <SText fontSize={13}>({workspaceName})</SText>
                                </SText>
                            )}
                        </SBox>
                    }
                />
                {loading && <SSpinner color={'primary.main'} size={32} />}
                {!loading && <RenderEnhancedCharacterizationList workspace={workspaceDB} />}
            </SVStack>
        </TouchableWithoutFeedback>
    );
}
