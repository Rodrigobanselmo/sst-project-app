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
import { SAFE_AREA_PADDING, pagePadding } from '@constants/constants';
import { CompanyModel } from '@libs/watermelon/model/CompanyModel';
import { addDotsText } from '@utils/helpers/addDotsText';
import { Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

    const handleSendApi = () => {
        const action = async () => {
            if (workspaceDB?.id) {
                const companyRepository = new CompanyRepository();

                const data = await companyRepository.getAll(workspaceDB.id);

                const characterizations = data.characterizations.map(
                    ({ photos, employees, hierarchies, characterization, riskData }) => {
                        return {
                            id: characterization.id,
                            apiId: characterization.apiId,
                            name: characterization.name,
                            type: characterization.type,
                            profileParentId: characterization.profileParentId,
                            profileName: characterization.profileName,
                            description: characterization.description,
                            status: characterization.status,
                            noiseValue: characterization.noiseValue,
                            temperature: characterization.temperature,
                            luminosity: characterization.luminosity,
                            moisturePercentage: characterization.moisturePercentage,
                            audios: characterization.audios,
                            videos: characterization.videos,
                            workspaceId: characterization.workspaceId,
                            companyId: characterization.companyId,
                            photos: photos.map((photo) => {
                                return {
                                    apiId: photo.apiId,
                                    name: photo.name,
                                    photoUrl: photo.photoUrl,
                                    companyCharacterizationId: photo.companyCharacterizationId,
                                };
                            }),
                            employees: employees.map((employee) => {
                                return {
                                    id: employee.id,
                                };
                            }),
                            hierarchies: hierarchies.map((hierarchy) => {
                                return {
                                    id: hierarchy.id,
                                };
                            }),
                            riskData: riskData?.map((riskData) => {
                                return {
                                    apiId: riskData.apiId,
                                    riskId: riskData.riskId,
                                    probability: riskData.probability,
                                    probabilityAfter: riskData.probabilityAfter,
                                    characterizationId: riskData.characterizationId,
                                    recsToRiskData: riskData.recsToRiskData,
                                    admsToRiskData: riskData.admsToRiskData,
                                    engsToRiskData: riskData.engsToRiskData,
                                    generateSourcesToRiskData: riskData.generateSourcesToRiskData,
                                    episToRiskData: riskData.episToRiskData,
                                };
                            }),
                        };
                    },
                );

                console.log(JSON.stringify(characterizations));

                // await companyRepository.updateWorkspaceDB(workspaceDB.id, {
                //     lastSendApiCharacterization_at: new Date(),
                // });
            }
        };

        Alert.alert(
            'Atenção',
            'Você tem certeza que deseja enviar os dados de caracterização para o sistema. Deseja continuar?',
            [
                {
                    text: 'Não',
                    style: 'cancel',
                },
                {
                    text: 'Sim, Enviar',
                    onPress: action,
                },
            ],
        );
    };

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
                {loading && <SSpinner color={'primary.main'} size={32} mt={29} />}
                {!loading && (
                    <>
                        <RenderEnhancedCharacterizationList workspace={workspaceDB} />
                        <SFloatingButton
                            renderInPortal={false}
                            shadow={2}
                            placement="bottom-right"
                            size="md"
                            mr={130}
                            bg="background.default"
                            borderColor={'primary.main'}
                            borderWidth={1}
                            _text={{ color: 'primary.main' }}
                            _pressed={{ bg: 'amber.100' }}
                            icon={<SIcon color="primary.main" as={Ionicons} name="cloud-upload-outline" size="4" />}
                            label="Enviar"
                            bottom={SAFE_AREA_PADDING.paddingBottom}
                            onPress={handleSendApi}
                        />
                    </>
                )}
            </SVStack>
        </TouchableWithoutFeedback>
    );
}
