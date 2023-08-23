import { SVStack, useSToast } from '@components/core';
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
import { useEffect, useState } from 'react';
import EnhancedCharacterizationList from './components/CharacterizationList';
import { CharacterizationsPageProps } from './types';

export function Characterizations({ route }: CharacterizationsPageProps): React.ReactElement {
    const [workspaceDB, setWorkspaceDB] = useState<WorkspaceModel>();
    const [characterizations, setCharacterizations] = useState<CharacterizationModel[]>([]);
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    const { navigate } = useNavigation<AppNavigatorRoutesProps>();
    const toast = useSToast();

    const handleCreateCharacterization = () => {
        navigate('characterization', { workspaceId: route.params.workspaceId });
    };

    async function fetchCharacterizations() {
        try {
            const companyRepository = new CompanyRepository();
            const { workspace } = await companyRepository.findOneWorkspace(route.params.workspaceId);

            setWorkspaceDB(workspace);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let isMounted = true;

        if (isMounted) {
            fetchCharacterizations();
        }

        return () => {
            isMounted = false;
        };
    }, []);

    // useFocusEffect(
    //     useCallback(() => {
    //         let isMounted = true;

    //         if (isMounted) {
    //             fetchCharacterizations();
    //         }

    //         return () => {
    //             isMounted = false;
    //         };
    //     }, []),
    // );

    const handleTest = async () => {
        const characterizationCollection = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);
        const characterizations = await characterizationCollection.query().fetch();

        const id = characterizations[0].id;
        const x = new CharacterizationRepository();
        x.update(id, {
            name: `teste ${Math.random().toFixed(2)}`,
            photos: [{ photoUrl: 'teste', id: 'teste' }],
        });
    };

    return (
        <SVStack flex={1}>
            <SScreenHeader title="Atividade" />
            <SButton mt={10} title="Criar conta" variant="outline" onPress={handleCreateCharacterization} />
            <SButton mt={10} title="Criar handleTest" variant="outline" onPress={handleTest} />
            {workspaceDB && <EnhancedCharacterizationList workspace={workspaceDB} />}
        </SVStack>
    );
}
