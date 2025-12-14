import React from 'react';
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

        // Track files that were not found (for warning message)
        const missingFiles: string[] = [];
        // Track skipped risk data due to errors
        const skippedRiskData: string[] = [];

        const action = async () => {
            console.log('🚀 Action iniciada');
            console.log('📊 Dados iniciais:', { workspaceId: workspaceDB?.id, companyId: companyDB?.id });

            const workspaceId = workspaceDB?.id as string;
            const companyId = companyDB?.id as string;

            const lastSync = workspaceDB?.lastSendApiCharacterization_at
                ? new Date(workspaceDB.lastSendApiCharacterization_at)
                : workspaceDB?.startChar_at
                  ? new Date(workspaceDB?.startChar_at)
                  : null;

            console.log('📅 LastSync:', lastSync);

            if (workspaceId && companyId) {
                console.log('✅ WorkspaceId e CompanyId válidos, iniciando sync...');
                console.log('🔄 Iniciando syncCharacterization...');
                await syncCharacterization({
                    workspaceId: route.params.workspaceId,
                    companyId: companyDB?.apiId || companyId,
                });
                console.log('✅ syncCharacterization concluído');

                console.log('📚 Inicializando repositories...');
                const companyRepository = new CompanyRepository();
                const recMedRepository = new RecMedRepository();
                const generateSourceRepository = new GenerateSourceRepository();
                const characterizationRepository = new CharacterizationRepository();

                console.log('📥 Buscando dados do companyRepository.getAll...');
                console.log('🔍 WorkspaceId:', workspaceId);
                console.log('🔍 CompanyRepository instance:', !!companyRepository);

                console.log('⏳ Iniciando chamada companyRepository.getAll...');
                const data = await companyRepository.getAll(workspaceId);
                console.log('✅ companyRepository.getAll concluído');
                console.log('📊 Dados obtidos:', {
                    characterizationsCount: data.characterizations?.length || 0,
                    hasData: !!data.characterizations,
                    dataKeys: Object.keys(data || {}),
                    dataType: typeof data,
                });

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

                console.log('🔄 Processando characterizations...');
                data.characterizations.forEach(
                    ({ photos, employees, hierarchies, characterization, riskData, audios, videos }, index) => {
                        console.log(`📋 Processando characterization ${index + 1}:`, {
                            id: characterization.id,
                            name: characterization.name,
                            hasPhotos: !!photos?.length,
                            hasVideos: !!videos?.length,
                            hasAudios: !!audios?.length,
                            hasRiskData: !!riskData?.length,
                            hasEmployees: !!employees?.length,
                            hasHierarchies: !!hierarchies?.length,
                        });

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
                console.log('✅ Processamento de characterizations concluído');

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

                console.log('📊 Resumo dos dados para envio:', {
                    recMeds: recMeds.length,
                    generateSources: generateSources.length,
                    subOffices: subOffices.length,
                    characterizations: characterizations.length,
                    characterizationsProfile: characterizationsProfile.length,
                    photosData: photosData.length,
                    riskDataInsert: riskDataInsert.length,
                    audiosData: audiosData.length,
                    videosData: videosData.length,
                    totalRequests,
                });

                console.log('🎯 Abrindo modal de progresso...');
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

                console.log('🔄 Iniciando envio de recMeds...');
                await asyncBatch(removeDuplicateById(recMeds), 5, async (recMed) => {
                    console.log('📤 Enviando recMed:', { id: recMed.id, riskId: recMed.riskId });
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
                            console.error('❌ Erro ao enviar recMed:', error);
                            errorsMessage.push(error?.message);
                        });

                    if (createdRecMec?.id && recMed.id) {
                        console.log('✅ RecMed criado com sucesso:', createdRecMec.id);
                        await recMedRepository.update(recMed.id, {
                            apiId: createdRecMec.id,
                        });
                    }

                    updateProgress();
                });
                console.log('✅ Envio de recMeds concluído');

                if (error(errorsMessage)) {
                    console.log('❌ Erro encontrado, parando execução');
                    return;
                }

                console.log('🔄 Iniciando envio de generateSources...');
                await asyncBatch(removeDuplicateById(generateSources), 5, async (generateSource) => {
                    console.log('📤 Enviando generateSource:', { id: generateSource.id, name: generateSource.name });
                    const createdGenerateSource = await createGenerateSource
                        .mutateAsync({
                            id: generateSource.id,
                            riskId: generateSource.riskId,
                            companyId: user.companyId as string,
                            name: generateSource.name,
                            returnIfExist: true,
                        })
                        .catch((error) => {
                            console.error('❌ Erro ao enviar generateSource:', error);
                            errorsMessage.push(error?.message);
                        });

                    if (createdGenerateSource?.id && generateSource.id) {
                        console.log('✅ GenerateSource criado com sucesso:', createdGenerateSource.id);
                        await generateSourceRepository.update(generateSource.id, {
                            apiId: createdGenerateSource.id,
                        });
                    }

                    updateProgress();
                });
                console.log('✅ Envio de generateSources concluído');

                if (error(errorsMessage)) {
                    console.log('❌ Erro encontrado, parando execução');
                    return;
                }

                console.log('🔄 Iniciando envio de subOffices...');
                await asyncBatch(subOffices, 5, async (subOffice) => {
                    console.log('📤 Enviando subOffice:', { id: subOffice.id, name: subOffice.name });
                    await createSubOffice
                        .mutateAsync({
                            companyId,
                            employeesIds: subOffice.employeesIds,
                            name: subOffice.name,
                            id: subOffice.id,
                        })
                        .catch((error) => {
                            console.error('❌ Erro ao enviar subOffice:', error);
                            errorsMessage.push(error?.message);
                        });

                    updateProgress();
                });
                console.log('✅ Envio de subOffices concluído');

                if (error(errorsMessage)) {
                    console.log('❌ Erro encontrado, parando execução');
                    return;
                }

                console.log('🔄 Iniciando envio de characterizations...');
                await asyncBatch(characterizations, 5, async (characterization) => {
                    console.log('📤 Enviando characterization:', {
                        id: characterization.id,
                        name: characterization.name,
                    });
                    await upsertCharacterization
                        .mutateAsync({
                            ...characterization,
                            hierarchyIds: characterizationHierarchyMap[characterization.id] || [],
                        })
                        .catch((error) => {
                            console.error('❌ Erro ao enviar characterization:', error);
                            errorsMessage.push(error?.message);
                        });

                    updateProgress();
                });
                console.log('✅ Envio de characterizations concluído');

                console.log('🔄 Iniciando envio de characterizationsProfile...');
                await asyncBatch(characterizationsProfile, 5, async (characterization) => {
                    console.log('📤 Enviando characterizationProfile:', {
                        id: characterization.id,
                        name: characterization.name,
                    });
                    await upsertCharacterization
                        .mutateAsync({
                            ...characterization,
                            hierarchyIds: characterizationHierarchyMap[characterization.id] || [],
                        })
                        .catch((error) => {
                            console.error('❌ Erro ao enviar characterizationProfile:', error);
                            errorsMessage.push(error?.message);
                        });

                    updateProgress();
                });
                console.log('✅ Envio de characterizationsProfile concluído');

                await captureLog({ message: 'done characterizations profile' });
                if (error(errorsMessage)) {
                    console.log('❌ Erro encontrado, parando execução');
                    return;
                }

                console.log('🔄 Iniciando envio de photosData...');
                await asyncBatch(photosData, 2, async (photo) => {
                    console.log('📤 Enviando photo:', { id: photo.id, name: photo.name });
                    const id = uuidGenerator.v4() as string;
                    const file = await getFormFileFromURI(photo.uri);

                    // Skip photos that don't exist
                    if (!file) {
                        console.warn('⚠️ Foto não encontrada, pulando:', photo.uri);
                        missingFiles.push(photo.uri);
                        updateProgress();
                        return;
                    }

                    const char = await createCharacterizationPhoto
                        .mutateAsync({
                            ...photo,
                            id,
                            file: file as any,
                        })
                        .catch((error) => {
                            console.error('❌ Erro ao enviar photo:', error);
                            captureExeption({ message: 'error photo', error });
                        });

                    if (char?.id && photo.id) {
                        console.log('✅ Photo criada com sucesso:', char.id);
                        await characterizationRepository.updatePhoto(photo.id, {
                            apiId: id,
                        });
                    }

                    updateProgress();
                });
                console.log('✅ Envio de photosData concluído');
                await captureLog({ message: 'done photo' });

                console.log('🔄 Iniciando envio de riskDataInsert...');
                await asyncBatch(riskDataInsert, 4, async (riskData) => {
                    console.log('📤 Enviando riskData:', { createId: riskData.createId, riskId: riskData.riskId });
                    await upsertRiskData
                        .mutateAsync({
                            ...riskData,
                        })
                        .catch((error) => {
                            console.error('❌ Erro ao enviar riskData:', error);
                            captureExeption({ message: 'error risk data', error, data: riskData });
                            // Don't stop the process, just log the error
                            skippedRiskData.push(riskData.riskId || riskData.createId || 'unknown');
                        });

                    updateProgress();
                });
                console.log('✅ Envio de riskDataInsert concluído');
                if (skippedRiskData.length > 0) {
                    console.warn('⚠️ RiskData com erros (ignorados):', skippedRiskData.length);
                }
                await captureLog({ message: 'done risk data' });

                console.log('🔄 Iniciando processamento de arquivos...');
                const createFile = async (files: (typeof audiosData)[0]) => {
                    console.log('📁 Processando arquivos:', files.length);
                    return await asyncBatch(files, 2, async (file) => {
                        console.log('📤 Enviando arquivo:', { uri: file.uri });
                        let apiId: string | undefined = uuidGenerator.v4() as string;
                        const fileForm = await getFormFileFromURI(file.uri);

                        // Skip files that don't exist
                        if (!fileForm) {
                            console.warn('⚠️ Arquivo não encontrado, pulando:', file.uri);
                            missingFiles.push(file.uri);
                            return { uri: file.uri, apiId: undefined };
                        }

                        await createCharacterizationFile
                            .mutateAsync({
                                ...file,
                                id: apiId,
                                file: fileForm as any,
                            })
                            .catch((error) => {
                                console.error('❌ Erro ao enviar arquivo:', error);
                                captureExeption({ message: 'error file', error });
                                apiId = undefined;
                            });

                        return { uri: file.uri, apiId };
                    });
                };

                console.log('🔄 Iniciando envio de audiosData...');
                await asyncBatch(audiosData, 2, async (audioData) => {
                    try {
                        console.log('🎵 Processando audios:', audioData.length);
                        const audiosFiles = await createFile(audioData);

                        const charId = audioData?.[0]?.companyCharacterizationId;

                        if (charId && audiosFiles.length > 0) {
                            console.log('✅ Atualizando audios para characterization:', charId);
                            await characterizationRepository.updateFiles(charId, {
                                audios: audiosFiles,
                            });
                        }

                        updateProgress();
                    } catch (e) {
                        console.error('❌ Erro ao processar audios:', e);
                        captureExeption({ message: 'error audio', error: e });
                    }
                });
                console.log('✅ Envio de audiosData concluído');
                await captureLog({ message: 'done audio' });

                console.log('🔄 Iniciando envio de videosData...');
                await asyncBatch(videosData, 2, async (videoData) => {
                    try {
                        console.log('🎬 Processando videos:', videoData.length);
                        const videosFiles = await createFile(videoData);

                        const charId = videoData?.[0]?.companyCharacterizationId;

                        if (charId && videosFiles.length > 0) {
                            console.log('✅ Atualizando videos para characterization:', charId);
                            await characterizationRepository.updateFiles(charId, {
                                videos: videosFiles,
                            });
                        }

                        updateProgress();
                    } catch (e) {
                        console.error('❌ Erro ao processar videos:', e);
                        await captureExeption({ message: 'error video', error: e });
                    }
                });
                console.log('✅ Envio de videosData concluído');
                await captureLog({ message: 'done video' });

                // Show success message with warning about missing files or skipped data
                console.log('🎉 Todos os dados foram enviados!');
                const hasWarnings = missingFiles.length > 0 || skippedRiskData.length > 0;
                if (hasWarnings) {
                    const warnings: string[] = [];
                    if (missingFiles.length > 0) {
                        console.warn('⚠️ Arquivos não encontrados:', missingFiles);
                        warnings.push(`${missingFiles.length} arquivo(s) de mídia não encontrado(s)`);
                    }
                    if (skippedRiskData.length > 0) {
                        console.warn('⚠️ RiskData com erros:', skippedRiskData);
                        warnings.push(`${skippedRiskData.length} dado(s) de risco com erro`);
                    }
                    Alert.alert(
                        'Sucesso com avisos',
                        `Dados enviados com sucesso.\n\n⚠️ Ignorados:\n${warnings.join('\n')}`,
                    );
                } else {
                    Alert.alert('Sucesso', 'Dados enviados com sucesso.');
                }

                console.log('💾 Atualizando workspace com timestamp...');
                await companyRepository.updateWorkspaceDB(workspaceId, {
                    lastSendApiCharacterization_at: new Date(),
                });

                console.log('🔑 Gerando chave de sync...');
                const key = onGenerateSyncCharacterizatinKey({
                    companyId,
                    userId: user.id,
                    workspaceId,
                });

                console.log('💾 Salvando timestamp no AsyncStorage...');
                AsyncStorage.setItem(key, new Date().toISOString());

                console.log('🎯 Fechando modal...');
                setModal({
                    open: false,
                    title: '',
                    type: 'progress',
                });
                console.log('✅ Action concluída com sucesso!');
            } else {
                console.log('❌ WorkspaceId ou CompanyId inválidos:', { workspaceId, companyId });
            }
        };

        console.log('🔄 Iniciando envio de dados...');

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
