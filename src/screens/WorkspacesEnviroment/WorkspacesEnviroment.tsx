import { SFloatingButton, SIcon, SVStack, useSToast } from '@components/core';
import { SScreenHeader } from '@components/index';
import { SSearchCompany } from '@components/organisms/SSearchModal/components/SSearchCompany';
import { SSearchWorkspace } from '@components/organisms/SSearchModal/components/SSearchWorkspace';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@hooks/useAuth';
import { ICompany, IWorkspace } from '@interfaces/ICompany';
import { useNavigation } from '@react-navigation/native';
import { CompanyRepository } from '@repositories/companyRepository';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { useEffect, useState } from 'react';
import { WorkspacesEviromentsPageProps } from './types';
import { UserAuthRepository } from '@repositories/userAuthRepository';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import EnhancedCharacterizationList from '@screens/Characterizations/components/CharacterizationList';

export function WorkspacesEnviroment({ route }: WorkspacesEviromentsPageProps): React.ReactElement {
    const [userDB, setUserDB] = useState<UserAuthModel>();
    const [isLoading, setIsLoading] = useState(true);
    const [isOpenAdd, setIsOpenAdd] = useState(false);
    const [company, setCompany] = useState<ICompany | null>(null);

    const { navigate } = useNavigation<AppNavigatorRoutesProps>();
    const { user } = useAuth();
    const toast = useSToast();

    const handleCreateCharacterizationGroup = async (workspace: IWorkspace) => {
        if (company) {
            const companyRepository = new CompanyRepository();
            await companyRepository.upsertByApiId({
                ...company,
                userId: user.id,
                apiId: company.id,
                workspace: [workspace].map((workspace) => ({
                    ...workspace,
                    ...workspace.address,
                    apiId: workspace.id,
                    withCharacterization: true,
                })),
            });

            try {
                const model = await companyRepository.findWorkspaceByApiId({
                    userId: user.id,
                    apiId: workspace.id,
                });

                navigate('characterizations', { workspaceId: model.workspace.id });
            } catch (error) {
                console.error(error);
            }
        }
    };

    async function fetchWorkspaces() {
        try {
            const userRepository = new UserAuthRepository();
            const { user: userDB } = await userRepository.findOne(user.id);

            setUserDB(userDB);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        let isMounted = true;

        if (isMounted) {
            fetchWorkspaces();
        }

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <SVStack flex={1}>
            <SScreenHeader title="Caracterizações" />
            {userDB && <EnhancedCharacterizationList user={userDB} />}

            <SFloatingButton
                renderInPortal={false}
                shadow={2}
                placement="bottom-right"
                size="md"
                bg="green.500"
                _pressed={{ bg: 'green.700' }}
                icon={<SIcon color="white" as={MaterialIcons} name="add" size="4" />}
                label="Nova Caracterização"
                onPress={() => setIsOpenAdd(true)}
            />

            {/* <SButton mt={10} title="Criar conta" variant="outline" onPress={handleCreateCharacterization} /> */}
            <SSearchCompany
                setShowModal={setIsOpenAdd}
                onSelect={(item) => {
                    setCompany(item);
                    setIsOpenAdd(false);
                }}
                showModal={isOpenAdd}
                // renderTopItem={() => (
                //     <SButton
                //         mb={2}
                //         height={9}
                //         p={0}
                //         title="Continuar sem empresa"
                //         variant="outline"
                //         onPress={handleCreateCharacterization}
                //     />
                // )}
            />
            <SSearchWorkspace
                setShowModal={() => setCompany(null)}
                showModal={!!company?.id}
                handleGoBack={() => {
                    setCompany(null);
                    setIsOpenAdd(true);
                }}
                onSelect={handleCreateCharacterizationGroup}
                // renderTopItem={() => (
                //     <SButton
                //         mb={2}
                //         height={9}
                //         p={0}
                //         title="Continuar sem empresa"
                //         variant="outline"
                //         onPress={handleCreateCharacterization}
                //     />
                // )}
            />
        </SVStack>
    );
}
