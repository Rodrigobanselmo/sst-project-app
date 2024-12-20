import { SBox, SFloatingButton, SIcon, SSpinner, SText, SVStack } from '@components/core';
import { SScreenHeader } from '@components/index';
import { SAFE_AREA_PADDING } from '@constants/constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@hooks/useAuth';
import { onGenerateSyncCharacterizatinKey, useSyncCharacterization } from '@hooks/useSyncCharacterization';
import { IEpiRiskData } from '@interfaces/IEpi';
import { useModalStore } from '@libs/storage/state/modal/modal.store';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import { CompanyModel } from '@libs/watermelon/model/CompanyModel';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CharacterizationRepository, IFileCharacterization } from '@repositories/characterizationRepository';
import { CompanyRepository } from '@repositories/companyRepository';
import { GenerateSourceRepository } from '@repositories/generateSourceRepository';
import { RecMedRepository } from '@repositories/recMedRepository';
import {
    IAddCharacterizationFile,
    useMutCreateCharacterizationFile,
} from '@services/api/characterization/createCharacterizationFile';
import {
    IAddCharacterizationPhoto,
    useMutCreateCharacterizationPhoto,
} from '@services/api/characterization/createCharacterizationPhoto';
import {
    IUpsertCharacterization,
    useMutUpsertCharacterization,
} from '@services/api/characterization/upsertCharacterization';
import { ICreateGenerateSource, useMutCreateGenerateSource } from '@services/api/generateSource/createGenerateSource';
import { IAutomateHierarchySubOffice, useMutateCreateSubOffice } from '@services/api/hierarchy/createSubOffice';
import { ICreateRecMed, useMutCreateRecMed } from '@services/api/recMed/createRecMed';
import { IUpsertRiskData, useMutUpsertRiskData } from '@services/api/riskData/upsertRiskData';
import { captureExeption, captureLog } from '@utils/errors/captureExecption';
import { asyncBatch } from '@utils/helpers/asyncBatch';
import { getFormFileFromURI } from '@utils/helpers/getAssetInfo';
import { removeDuplicateById } from '@utils/helpers/removeDuplicate';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import uuidGenerator from 'react-native-uuid';
import RenderEnhancedCharacterizationList from './components/CharacterizationList';
import { CharacterizationsPageProps } from './types';

export function Characterizations({ route }: CharacterizationsPageProps): React.ReactElement {
    const [workspaceDB, setWorkspaceDB] = useState<WorkspaceModel>();
    const [companyDB, setCompanyDB] = useState<CompanyModel>();
    const [loading, setLoading] = useState([true, true]);
    const { user } = useAuth();
    const { syncCharacterization } = useSyncCharacterization();

    const createRecMed = useMutCreateRecMed();
    const createGenerateSource = useMutCreateGenerateSource();
    const createCharacterizationPhoto = useMutCreateCharacterizationPhoto();
    const createCharacterizationFile = useMutCreateCharacterizationFile();
    const upsertCharacterization = useMutUpsertCharacterization();
    const upsertRiskData = useMutUpsertRiskData();
    const createSubOffice = useMutateCreateSubOffice();

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
            setLoading((prev) => {
                const newLoading = [...prev];
                newLoading[0] = false;

                return newLoading;
            });
        }
    }, [route.params.workspaceId]);

    const handleSendApi = () => {
        const setModal = useModalStore.getState().setModal;
        const setPartialModal = useModalStore.getState().setPartialModal;

        const error = (erros: string[]) => {
            const modal = useModalStore.getState().modal;
            if ('status' in modal && modal.status === 'canceled') {
                Alert.alert('Ação cancelada', 'A ação de envio dos dados para o sistema foi cancelada.');
                return true;
            }

            if (erros.length > 0) {
                setModal({
                    open: false,
                    type: 'progress',
                    title: 'Enviando dados',
                });
                Alert.alert('Atenção', `Ocorreu um erro ao enviar os dados para o sistema. Erros: ${erros?.[0]}`);
                return true;
            }
            return false;
        };

        const updateProgress = () => {
            setPartialModal((data) => ({ ...data, actual: (data as any).actual + 1 }));
        };

        const action = async () => {
            const workspaceId = workspaceDB?.id as string;
            const companyId = companyDB?.id as string;

            const lastSync = workspaceDB?.lastSendApiCharacterization_at
                ? new Date(workspaceDB.lastSendApiCharacterization_at)
                : workspaceDB?.startChar_at
                  ? new Date(workspaceDB?.startChar_at)
                  : null;

            if (workspaceId && companyId) {
                await syncCharacterization({
                    workspaceId: route.params.workspaceId,
                    companyId: companyDB?.apiId || companyId,
                });

                const companyRepository = new CompanyRepository();
                const recMedRepository = new RecMedRepository();
                const generateSourceRepository = new GenerateSourceRepository();
                const characterizationRepository = new CharacterizationRepository();

                const data = await companyRepository.getAll(workspaceId);

                const recMeds: ICreateRecMed[] = [];
                const riskDataInsert: IUpsertRiskData[] = [];
                const generateSources: ICreateGenerateSource[] = [];
                const subOffices: IAutomateHierarchySubOffice[] = [];
                const characterizations: (IUpsertCharacterization & { id: string })[] = [];
                const characterizationsProfile: (IUpsertCharacterization & { id: string })[] = [];
                const photosData: (Omit<IAddCharacterizationPhoto, 'file'> & { uri: string })[] = [];
                const videosData: (Omit<IAddCharacterizationFile, 'file'> & { uri: string })[][] = [];
                const audiosData: (Omit<IAddCharacterizationFile, 'file'> & { uri: string })[][] = [];

                const characterizationHierarchyMap: Record<string, string[]> = {};

                const addPhoto = (
                    photos: CharacterizationPhotoModel[],
                    params: { characterizationId: string; name: string },
                ) => {
                    photos.forEach((photo) => {
                        if (!photo.apiId)
                            photosData.push({
                                id: photo.id,
                                name: photo.name || params.name,
                                companyCharacterizationId: params.characterizationId,
                                workspaceId: workspaceId,
                                companyId,
                                uri: photo.photoUrl,
                            });
                    });
                };

                const addFile = (
                    files: IFileCharacterization[],
                    params: { characterizationId: string; isAudio?: boolean },
                ) => {
                    (params.isAudio ? audiosData : videosData).push(
                        files
                            .filter((file) => !file.apiId)
                            .map((file) => {
                                return {
                                    companyCharacterizationId: params.characterizationId,
                                    workspaceId: workspaceId,
                                    companyId,
                                    uri: file.uri,
                                };
                            }),
                    );
                };

                const addRecMedGs = (riskData: (typeof data.characterizations)[0]['riskData']) => {
                    riskData?.forEach((riskData) => {
                        riskData.generateSourcesToRiskData?.forEach((generateSource) => {
                            if (!generateSource.apiId)
                                generateSources.push({
                                    riskId: generateSource.riskId,
                                    companyId: companyId,
                                    id: generateSource.id,
                                    name: generateSource.name,
                                });
                        });

                        riskData.recsToRiskData?.forEach((rec) => {
                            if (!rec.apiId)
                                recMeds.push({
                                    riskId: rec.riskId,
                                    companyId: companyId,
                                    id: rec.id,
                                    redName: rec.name,
                                });
                        });

                        riskData.admsToRiskData?.forEach((adm) => {
                            if (!adm.apiId)
                                recMeds.push({
                                    riskId: adm.riskId,
                                    companyId: companyId,
                                    id: adm.id,
                                    medName: adm.name,
                                });
                        });

                        riskData.engsToRiskData?.forEach((eng) => {
                            if (!eng.apiId)
                                recMeds.push({
                                    riskId: eng.riskId,
                                    companyId: companyId,
                                    id: eng.id,
                                    medName: eng.name,
                                });
                        });
                    });
                };

                const addRiskData = (
                    riskData: (typeof data.characterizations)[0]['riskData'],
                    params: { characterizationId: string },
                ) => {
                    riskData?.forEach((riskData) => {
                        if (lastSync && riskData.updatedAt && new Date(riskData.updatedAt) < lastSync) return;

                        riskDataInsert.push({
                            createId: riskData.id,
                            companyId: companyId,
                            exposure: riskData.exposure,
                            activities: riskData.activities,
                            homogeneousGroupId: params.characterizationId,
                            generateSources: riskData.generateSourcesToRiskData.map(
                                (generateSource) => generateSource.id,
                            ),
                            adms: riskData.admsToRiskData.map((adm) => adm.id),
                            recs: riskData.recsToRiskData.map((rec) => rec.id),
                            engs: riskData.engsToRiskData.map((eng) => ({
                                recMedId: eng.id,
                                efficientlyCheck: eng.efficientlyCheck,
                            })),
                            epis:
                                riskData.episToRiskData?.map<IEpiRiskData>((epi) => ({
                                    epiId: Number(epi.id),
                                    efficientlyCheck: epi.efficientlyCheck,
                                    epcCheck: epi.efficientlyCheck,
                                    longPeriodsCheck: epi.efficientlyCheck,
                                    validationCheck: epi.efficientlyCheck,
                                    tradeSignCheck: epi.efficientlyCheck,
                                    sanitationCheck: epi.efficientlyCheck,
                                    maintenanceCheck: epi.efficientlyCheck,
                                    unstoppedCheck: epi.efficientlyCheck,
                                    trainingCheck: epi.efficientlyCheck,
                                })) || [],
                            probability: riskData.probability,
                            probabilityAfter: riskData.probabilityAfter,
                            riskId: riskData.riskId,
                        });
                    });
                };

                const addCharacterization = (
                    characterization: CharacterizationModel,
                    hierarchies: HierarchyModel[],
                ) => {
                    if (lastSync && characterization.updated_at && new Date(characterization.updated_at) < lastSync)
                        return;

                    characterizationHierarchyMap[characterization.id] = hierarchies
                        .map((hierarchy) => hierarchy.apiId as string)
                        .filter(Boolean);

                    (characterization.profileParentId ? characterizationsProfile : characterizations).push({
                        id: characterization.id,
                        companyId,
                        workspaceId,
                        name: characterization.name,
                        description: characterization.description,
                        type: characterization.type,
                        luminosity: characterization.luminosity,
                        moisturePercentage: characterization.moisturePercentage,
                        noiseValue: characterization.noiseValue,
                        temperature: characterization.temperature,
                        profileName: characterization.profileName,
                        profileParentId: characterization.profileParentId,
                    });
                };

                const addSubOffices = (
                    employees: EmployeeModel[],
                    params: { name: string; characterizationId: string },
                ) => {
                    if (!employees.length) return;

                    const employeesHierarchyMap = employees.reduce(
                        (acc, employee) => {
                            if (employee.hierarchyId && employee.apiId) {
                                if (!acc[employee.hierarchyId]) acc[employee.hierarchyId] = [];
                                acc[employee.hierarchyId].push(employee.apiId);
                            }
                            return acc;
                        },
                        {} as Record<string, number[]>,
                    );

                    Object.entries(employeesHierarchyMap).forEach(([hierarchyId, employeeIds]) => {
                        const subOfficeId = params.characterizationId + hierarchyId;
                        characterizationHierarchyMap[params.characterizationId].push(subOfficeId);
                        subOffices.push({
                            companyId,
                            employeesIds: employeeIds,
                            name: `??HIERARCHY_NAME?? (${params.name})`,
                            id: subOfficeId,
                        });
                    });
                };

                data.characterizations.forEach(
                    ({ photos, employees, hierarchies, characterization, riskData, audios, videos }) => {
                        const characterizationName = characterization.profileName || characterization.name;
                        const characterizationId = characterization.id;

                        if (characterization) addCharacterization(characterization, hierarchies);
                        if (videos) addFile(videos, { isAudio: false, characterizationId });
                        if (audios) addFile(audios, { isAudio: true, characterizationId });
                        if (riskData) addRecMedGs(riskData);
                        if (riskData) addRiskData(riskData, { characterizationId });
                        if (riskData) addSubOffices(employees, { characterizationId, name: characterizationName });
                        if (photos) addPhoto(photos, { name: characterization.name, characterizationId });
                    },
                );

                const errorsMessage: string[] = [];
                const totalRequests =
                    recMeds.length +
                    generateSources.length +
                    subOffices.length +
                    characterizations.length +
                    characterizationsProfile.length +
                    photosData.length +
                    riskDataInsert.length +
                    audiosData.length +
                    videosData.length;

                setModal({
                    open: true,
                    type: 'progress',
                    title: 'Enviando dados',
                    bottomText: 'Por favor espere enquanto sincronizamos os dados',
                    actual: 0,
                    total: totalRequests,
                    status: 'pending',
                    onCancel: (onClose) => {
                        Alert.alert('Você tem certeza?', 'Deseja cancelar o envio dos dados para o sistema?', [
                            {
                                text: 'Não',
                                style: 'cancel',
                            },
                            {
                                text: 'Sim, Cancelar',
                                onPress: onClose,
                            },
                        ]);
                    },
                });

                await asyncBatch(removeDuplicateById(recMeds), 5, async (recMed) => {
                    const createdRecMec = await createRecMed
                        .mutateAsync({
                            id: recMed.id,
                            riskId: recMed.riskId,
                            companyId: user.companyId as string,
                            medName: recMed.medName,
                            redName: recMed.redName,
                            returnIfExist: true,
                        })
                        .catch((error) => {
                            errorsMessage.push(error?.message);
                        });

                    if (createdRecMec?.id && recMed.id) {
                        await recMedRepository.update(recMed.id, {
                            apiId: createdRecMec.id,
                        });
                    }

                    updateProgress();
                });

                if (error(errorsMessage)) return;

                await asyncBatch(removeDuplicateById(generateSources), 5, async (generateSource) => {
                    const createdGenerateSource = await createGenerateSource
                        .mutateAsync({
                            id: generateSource.id,
                            riskId: generateSource.riskId,
                            companyId: user.companyId as string,
                            name: generateSource.name,
                            returnIfExist: true,
                        })
                        .catch((error) => {
                            errorsMessage.push(error?.message);
                        });

                    if (createdGenerateSource?.id && generateSource.id) {
                        await generateSourceRepository.update(generateSource.id, {
                            apiId: createdGenerateSource.id,
                        });
                    }

                    updateProgress();
                });

                if (error(errorsMessage)) return;

                await asyncBatch(subOffices, 5, async (subOffice) => {
                    await createSubOffice
                        .mutateAsync({
                            companyId,
                            employeesIds: subOffice.employeesIds,
                            name: subOffice.name,
                            id: subOffice.id,
                        })
                        .catch((error) => {
                            errorsMessage.push(error?.message);
                        });

                    updateProgress();
                });

                if (error(errorsMessage)) return;

                await asyncBatch(characterizations, 5, async (characterization) => {
                    await upsertCharacterization
                        .mutateAsync({
                            ...characterization,
                            hierarchyIds: characterizationHierarchyMap[characterization.id] || [],
                        })
                        .catch((error) => {
                            errorsMessage.push(error?.message);
                        });

                    updateProgress();
                });

                await asyncBatch(characterizationsProfile, 5, async (characterization) => {
                    await upsertCharacterization
                        .mutateAsync({
                            ...characterization,
                            hierarchyIds: characterizationHierarchyMap[characterization.id] || [],
                        })
                        .catch((error) => {
                            errorsMessage.push(error?.message);
                        });

                    updateProgress();
                });

                await captureLog({ message: 'done characterizations profile' });
                if (error(errorsMessage)) return;

                await asyncBatch(photosData, 2, async (photo) => {
                    const id = uuidGenerator.v4() as string;
                    const file = await getFormFileFromURI(photo.uri);

                    const char = await createCharacterizationPhoto
                        .mutateAsync({
                            ...photo,
                            id,
                            file,
                        })
                        .catch((error) => {
                            captureExeption({ message: 'error photo', error });
                            errorsMessage.push(error?.message);
                        });

                    if (char?.id && photo.id) {
                        await characterizationRepository.updatePhoto(photo.id, {
                            apiId: id,
                        });
                    }

                    updateProgress();
                });

                await captureLog({ message: 'done photo' });
                if (error(errorsMessage)) return;

                await asyncBatch(riskDataInsert, 4, async (riskData) => {
                    await upsertRiskData
                        .mutateAsync({
                            ...riskData,
                        })
                        .catch((error) => {
                            captureExeption({ message: 'error risk data', error });
                            errorsMessage.push(error?.message);
                        });

                    updateProgress();
                });

                await captureLog({ message: 'done risk data' });
                if (error(errorsMessage)) return;

                const createFile = async (files: (typeof audiosData)[0]) => {
                    return await asyncBatch(files, 2, async (file) => {
                        let apiId: string | undefined = uuidGenerator.v4() as string;
                        const fileForm = await getFormFileFromURI(file.uri);

                        await createCharacterizationFile
                            .mutateAsync({
                                ...file,
                                id: apiId,
                                file: fileForm,
                            })
                            .catch((error) => {
                                errorsMessage.push(error?.message);
                                captureExeption({ message: 'error file', error });
                                apiId = undefined;
                            });

                        return { uri: file.uri, apiId };
                    });
                };

                await asyncBatch(audiosData, 2, async (audioData) => {
                    try {
                        const audiosFiles = await createFile(audioData);

                        const charId = audioData?.[0]?.companyCharacterizationId;

                        if (charId && audiosFiles.length > 0) {
                            await characterizationRepository.updateFiles(charId, {
                                audios: audiosFiles,
                            });
                        }

                        updateProgress();
                    } catch (e) {
                        captureExeption({ message: 'error audio', error });
                    }
                });

                await captureLog({ message: 'done audio' });
                if (error(errorsMessage)) {
                    await captureExeption({ message: 'audio errors message', error: errorsMessage });
                }

                await asyncBatch(videosData, 2, async (videoData) => {
                    try {
                        const videosFiles = await createFile(videoData);

                        const charId = videoData?.[0]?.companyCharacterizationId;

                        if (charId && videosFiles.length > 0) {
                            await characterizationRepository.updateFiles(charId, {
                                videos: videosFiles,
                            });
                        }

                        updateProgress();
                    } catch (e) {
                        await captureExeption({ message: 'error video', error: e });
                    }
                });

                await captureLog({ message: 'done video' });
                if (error(errorsMessage)) return;

                Alert.alert('Sucesso', 'Dados enviados com sucesso.');

                await companyRepository.updateWorkspaceDB(workspaceId, {
                    lastSendApiCharacterization_at: new Date(),
                });

                const key = onGenerateSyncCharacterizatinKey({
                    companyId,
                    userId: user.id,
                    workspaceId,
                });

                AsyncStorage.setItem(key, new Date().toISOString());

                setModal({
                    open: false,
                    title: '',
                    type: 'progress',
                });
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

    useEffect(() => {
        const sync = async () => {
            if (companyDB?.apiId) {
                await syncCharacterization({ workspaceId: route.params.workspaceId, companyId: companyDB.apiId });
                setLoading((prev) => {
                    const newLoading = [...prev];
                    newLoading[1] = false;

                    return newLoading;
                });
            }
        };

        sync();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyDB, route.params.workspaceId]);

    const companyName = companyDB?.fantasy || companyDB?.name || '';
    const workspaceName = workspaceDB?.name || '';
    const isLoading = loading.some(Boolean);

    return (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <SVStack flex={1}>
                <SScreenHeader
                    mb={4}
                    backButton
                    title="Ambientes / Atividades"
                    subtitleComponent={
                        <SBox px={12}>
                            {!isLoading && (
                                <SText fontSize={14} color="text.label">
                                    {companyName} <SText fontSize={13}>({workspaceName})</SText>
                                </SText>
                            )}
                        </SBox>
                    }
                />
                {isLoading && <SSpinner color={'primary.main'} size={32} mt={29} />}
                {!isLoading && (
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
