import { SFloatingButton, SIcon, SSpinner, SVStack, useSToast } from '@components/core';
import { SHomeHeader } from '@components/index';
import { SSearchCompany } from '@components/organisms/SSearchModal/components/SSearchCompany';
import { SSearchWorkspace } from '@components/organisms/SSearchModal/components/SSearchWorkspace';
import { MaterialIcons } from '@expo/vector-icons';
import { useGetUser } from '@hooks/database/useGetUser';
import { useSync } from '@hooks/useSync';
import { ICompany, IWorkspace } from '@interfaces/ICompany';
import { useNavigation } from '@react-navigation/native';
import { CompanyRepository } from '@repositories/companyRepository';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { useState } from 'react';
import EnhancedWorkspaceEnviromentList from './components/WorkspaceEnviromentList';
import { WorkspacesEviromentsPageProps } from './types';

export function WorkspacesEnviroment({ route }: WorkspacesEviromentsPageProps): React.ReactElement {
    const [isOpenAdd, setIsOpenAdd] = useState(false);
    const [company, setCompany] = useState<ICompany | null>(null);
    // const { setHierarchyList } = usePersistedStateHierarchy({
    //     companyId: company?.id,
    //     autoFetch: false,
    // });

    const { navigate } = useNavigation<AppNavigatorRoutesProps>();
    const { user, isLoading, setIsLoading, userDatabase } = useGetUser();
    const toast = useSToast();
    const { syncChanges } = useSync();

    const handleCreateCharacterizationGroup = async (workspace: IWorkspace, workspaces: IWorkspace[]) => {
        if (company) {
            const companyRepository = new CompanyRepository();
            try {
                setIsLoading(true);

                // const hierarchies = await getHierarchySync({
                //     companyId: company.id,
                //     workspaceId: workspace.id,
                // });

                const sync = await syncChanges();
                if (sync?.error) throw sync.error;
                const syncCompany = await syncChanges({ companyStartIds: [company.id] });
                if (syncCompany?.error) throw syncCompany.error;

                await companyRepository.upsertByApiId({
                    ...company,
                    userId: user.id,
                    apiId: company.id,
                    workspace: [workspace].map((w) => ({
                        ...w,
                        ...w?.address,
                        apiId: w.id,
                        userId: user.id,
                        ...(workspace.id === w.id && {
                            startChar_at: new Date(),
                        }),
                    })),
                });

                const foundWorkspace = await companyRepository.findWorkspaceByApiId({
                    apiId: workspace.id,
                    userId: user.id,
                });

                setIsLoading(false);
                navigate('characterizations', { workspaceId: foundWorkspace.workspace.id });
            } catch (error) {
                console.error('handleCreateCharacterizationGroup', error);
                toast.show({
                    title: 'Erro ao criar caracterização!',
                    placement: 'top',
                    bgColor: 'red.500',
                });
                setIsLoading(false);
            }
        }
    };

    return (
        <SVStack flex={1}>
            {/* <SScreenHeader title="Caracterizações" mb={4} /> */}
            <SHomeHeader bottomSpace />

            {isLoading && <SSpinner color={'primary.main'} size={32} />}
            {userDatabase && <EnhancedWorkspaceEnviromentList user={userDatabase} />}

            <SFloatingButton
                renderInPortal={false}
                disabled={isLoading}
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
            {isOpenAdd && (
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
            )}
            {!!company?.id && (
                <SSearchWorkspace
                    isLoading={isLoading}
                    setShowModal={() => setCompany(null)}
                    showModal={!!company?.id}
                    handleGoBack={() => {
                        setCompany(null);
                        setIsOpenAdd(true);
                    }}
                    companyId={company?.id}
                    onSelect={(item, items) => handleCreateCharacterizationGroup(item, items)}
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
            )}
        </SVStack>
    );
}
