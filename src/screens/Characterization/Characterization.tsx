import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    CharacterizationFormProps,
    CharacterizationPageProps,
    FormCharacterizationRoutesProps,
    FormCharacterizationScreenProps,
    RiskDataFormProps,
} from './types';
// import * as ImagePicker from 'expo-image-picker';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CameraPage } from '@screens/Camera';
import { IImageGallery } from '@screens/Camera/types';
import * as ImagePickerExpo from 'expo-image-picker';
import { CharacterizationForm } from './components/Characterization/CharacterizationForm';
import { useForm } from 'react-hook-form';
import { ICharacterizationValues, characterizationSchema } from './schemas';
import { yupResolver } from '@hookform/resolvers/yup';
import { database } from '@libs/watermelon';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { StatusEnum } from '@constants/enums/status.enum';
import { useAuth } from '@hooks/useAuth';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import { Collection } from '@nozbe/watermelondb';
import { SButton, SLoading } from '@components/modelucules';
import { CharacterizationRepository } from '@repositories/characterizationRepository';
import { CharacterizationTabView } from './components/Characterization/CharacterizationTabView';
import { RiskDataForm } from './components/RiskData/RiskDataForm';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { RiskDataPage } from './components/RiskData/RiskDataPage';
import { SVStack } from '@components/core';
import { SAFE_AREA_PADDING, pagePadding } from '@constants/constants';
import { RecsRiskDataModel } from '@libs/watermelon/model/_MMModel/RecsRiskDataModel';
import { AdmsRiskDataModel } from '@libs/watermelon/model/_MMModel/AdmsRiskDataModel';
import { EngsRiskDataModel } from '@libs/watermelon/model/_MMModel/EngsRiskDataModel';
import { EpisRiskDataModel } from '@libs/watermelon/model/_MMModel/EpisRiskDataModel';
import { GenerateRiskDataModel } from '@libs/watermelon/model/_MMModel/GenerateRiskDataModel';
import { RecMedModel } from '@libs/watermelon/model/RecMedModel';
import { GenerateSourceModel } from '@libs/watermelon/model/GenerateSourceModel';
import { RiskDataModel } from '@libs/watermelon/model/RiskDataModel';
import { RiskDataRepository } from '@repositories/riskDataRepository';
import { IHierarchy } from '@interfaces/IHierarchy';
import { Alert } from 'react-native';
import { useGetCharacterization } from '@hooks/database/useGetCharacterization';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import { useThrottle } from '@hooks/useThrottle';
import { SLoadingPage } from '@components/organisms/SLoadingPage';

const Stack = createNativeStackNavigator<FormCharacterizationRoutesProps>();

export const GALLERY_IMAGE_Width = 300;
export const GALLERY_IMAGE_PORTRAIT_WIDTH = (((GALLERY_IMAGE_Width * 9) / 16) * 9) / 16;
export const GALLERY_IMAGE_HEIGHT = (GALLERY_IMAGE_Width * 9) / 16;

export function Characterization({ navigation, route }: CharacterizationPageProps): React.ReactElement {
    const [isLoading, setIsLoading] = useState(false);
    const saveRef = useRef(false);
    const { control, trigger, getValues, setValue } = useForm<ICharacterizationValues>({
        resolver: yupResolver(characterizationSchema),
    });

    const [form, setForm] = useState({ workspaceId: route.params.workspaceId } as CharacterizationFormProps);
    const { user } = useAuth();

    const characterizationId = useMemo(() => form.id, [form.id]);
    const principalProfileId = useMemo(
        () => form.profileParentId || characterizationId,
        [characterizationId, form.profileParentId],
    );
    const isPrincipalProfile = useMemo(
        () => principalProfileId == characterizationId,
        [characterizationId, principalProfileId],
    );

    const {
        characterizations: characterizationsProfiles,
        isLoading: isLoadingProfiles,
        refetch: refetchProfiles,
    } = useGetCharacterization({
        profileId: principalProfileId,
    });

    const onSaveForm = useCallback(
        async (options?: { skipGoBack?: boolean }) => {
            if (saveRef.current) return;

            const isValid = await trigger(['name', 'type']);
            let characterization: CharacterizationModel | undefined;
            setIsLoading(true);
            saveRef.current = true;

            try {
                if (isValid) {
                    const {
                        name,
                        profileName,
                        type,
                        noiseValue,
                        temperature,
                        luminosity,
                        description,
                        moisturePercentage,
                    } = getValues();

                    const characterizationRepo = new CharacterizationRepository();
                    if (characterizationId) {
                        characterization = await characterizationRepo.update(characterizationId, {
                            name: name as string,
                            type,
                            noiseValue,
                            temperature,
                            luminosity,
                            description,
                            moisturePercentage,
                            ...(isPrincipalProfile && {
                                photos: form.photos?.map((photo) => ({ photoUrl: photo.uri, id: photo.id })),
                            }),
                            ...(!isPrincipalProfile && {
                                profileName,
                            }),
                        });

                        if (!isPrincipalProfile && principalProfileId) {
                            characterization = await characterizationRepo.update(principalProfileId, {
                                photos: form.photos?.map((photo) => ({ photoUrl: photo.uri, id: photo.id })),
                            });
                        }
                    } else {
                        characterization = await characterizationRepo.create({
                            name: name as string,
                            type,
                            noiseValue,
                            temperature,
                            luminosity,
                            description,
                            workspaceId: route.params.workspaceId,
                            moisturePercentage,
                            userId: user.id,
                            photos: form.photos?.map((photo) => ({ photoUrl: photo.uri, id: photo.id })),
                            riskData: form.riskData,
                            hierarchiesIds: form.hierarchies?.map((h) => h.id),
                            employeeIds: form.employees?.map((h) => h.id),
                        });
                    }

                    if (!options?.skipGoBack)
                        navigation.navigate('characterizations', { workspaceId: route.params.workspaceId });

                    return characterization;
                }
            } catch (error) {
                //
            }

            saveRef.current = false;
            setIsLoading(false);
        },
        [
            trigger,
            getValues,
            characterizationId,
            navigation,
            route.params.workspaceId,
            isPrincipalProfile,
            form.photos,
            form.riskData,
            form.hierarchies,
            form.employees,
            principalProfileId,
            user.id,
        ],
    );

    const onEditForm = useCallback((formValues: Partial<CharacterizationFormProps>) => {
        setForm((prev) => ({ ...prev, ...formValues }));
    }, []);

    const onDeleteForm = useCallback(async () => {
        if (characterizationId) {
            const characterizationRepo = new CharacterizationRepository();
            await characterizationRepo.delete(characterizationId);
            navigation.navigate('characterizations', { workspaceId: route.params.workspaceId });
        }
    }, [navigation, characterizationId, route.params.workspaceId]);

    const onGoBack = useCallback(() => {
        navigation.navigate('characterizations', { workspaceId: route.params.workspaceId });
    }, [navigation, route.params.workspaceId]);

    const openCamera = async () => {
        try {
            const permissionResult = await ImagePickerExpo.requestCameraPermissionsAsync();

            if (permissionResult.granted === false) {
                alert('Você recusou permitir que este aplicativo acesse sua câmera!');
                return;
            }

            navigation.navigate('cameraCharacterization');
        } catch (error) {
            console.error(error);
        }
    };

    const onCameraSave = useCallback(({ photos }: { photos: IImageGallery[] }) => {
        setForm((prev) => ({ ...prev, photos: [...(prev.photos || []), ...photos] }));
    }, []);

    const onRiskDataSave = useCallback(
        async (formValues: RiskDataFormProps) => {
            try {
                if (characterizationId && formValues.id) {
                    const riskDataRepository = new RiskDataRepository();
                    await riskDataRepository.update(formValues.id, {
                        ...formValues,
                    });
                }

                setForm((prev) => {
                    const riskData = [...(prev.riskData || [])];
                    const riskIndex = riskData.findIndex((rd) => rd.riskId === formValues.riskId);

                    if (riskIndex >= 0) {
                        riskData[riskIndex] = formValues;
                    } else {
                        riskData.push(formValues);
                    }

                    return { ...prev, riskData };
                });
            } catch (error) {
                console.error(error);
            }
        },
        [characterizationId],
    );

    const onRiskDataDelete = useCallback(
        async (formValues: RiskDataFormProps) => {
            if (characterizationId && formValues.id) {
                const riskDataRepository = new RiskDataRepository();
                await riskDataRepository.delete(formValues.id);
            }

            setForm((prev) => {
                const riskData = [...(prev.riskData || [])];
                const riskIndex = riskData.findIndex((rd) => rd.riskId === formValues.riskId);

                if (riskIndex >= 0) {
                    riskData.splice(riskIndex, 1);
                }

                return { ...prev, riskData };
            });
        },
        [characterizationId],
    );

    const onClickRisk = async (risk: RiskModel) => {
        const riskData = form.riskData?.find((rd) => rd.riskId === risk.id);

        let params: RiskDataFormProps = {
            riskId: risk.id,
        };

        if (riskData) {
            params = { ...params, ...riskData };
        }

        navigation.navigate('formRiskData', params);
    };

    const onClickHierarchy = async (hierarchy: IHierarchy) => {
        const hierarchies = [...(form?.hierarchies || [])];
        const hierarchyIndex = hierarchies.findIndex((rd) => rd.id === hierarchy.id);

        if (hierarchyIndex >= 0) {
            Alert.alert('Atenção', 'Você tem certeza que deseja remover permnentemente. Deseja continuar?', [
                {
                    text: 'Não',
                    style: 'cancel',
                },
                {
                    text: 'Sim, apagar',
                    onPress: async () => {
                        hierarchies.splice(hierarchyIndex, 1);
                        if (characterizationId) {
                            const characterizationRepository = new CharacterizationRepository();
                            await characterizationRepository.deleteMMHierarchy(hierarchy.id, characterizationId);
                        }
                        setForm((prev) => {
                            return { ...prev, hierarchies };
                        });
                    },
                },
            ]);
        } else {
            if (characterizationId) {
                const characterizationRepository = new CharacterizationRepository();
                await database.write(async () => {
                    await characterizationRepository.createMMHierarchy(
                        [hierarchy.id],
                        characterizationId as string,
                        user.id,
                    );
                });
            }

            setForm((prev) => {
                hierarchies.push(hierarchy);
                return { ...prev, hierarchies };
            });
        }
    };

    const onClickEmployee = async (employee: EmployeeModel) => {
        const employees = [...(form?.employees || [])];
        const employeeIndex = employees.findIndex((_e) => _e.id === employee.id);

        if (employeeIndex >= 0) {
            Alert.alert('Atenção', 'Você tem certeza que deseja remover permnentemente. Deseja continuar?', [
                {
                    text: 'Não',
                    style: 'cancel',
                },
                {
                    text: 'Sim, apagar',
                    onPress: async () => {
                        employees.splice(employeeIndex, 1);
                        if (characterizationId) {
                            const characterizationRepository = new CharacterizationRepository();
                            await characterizationRepository.deleteMMEmployee(employee.id, characterizationId);
                        }
                        setForm((prev) => {
                            return { ...prev, employees };
                        });
                    },
                },
            ]);
        } else {
            if (characterizationId) {
                const characterizationRepository = new CharacterizationRepository();
                await database.write(async () => {
                    await characterizationRepository.createMMEmployee(
                        [employee.id],
                        characterizationId as string,
                        user.id,
                    );
                });
            }

            setForm((prev) => {
                employees.push(employee);
                return { ...prev, employees };
            });
        }
    };

    const getCharacterization = useCallback(
        async (options?: { characterizationId?: string; principalProfileId?: string }) => {
            const id = options?.characterizationId || route.params.id;

            if (id) {
                const characterizationRepo = new CharacterizationRepository();
                const {
                    characterization,
                    photos: p,
                    riskData,
                    hierarchies,
                    employees,
                } = await characterizationRepo.findOne(id);

                let name = characterization.name;
                let type = characterization.type;
                let photos = p;

                const isProfile =
                    options?.principalProfileId &&
                    options?.characterizationId &&
                    options.principalProfileId !== options.characterizationId;

                if (isProfile) {
                    const principalData = await characterizationRepo.findOne(options.principalProfileId as string);
                    name = principalData.characterization.name;
                    type = principalData.characterization.type;
                    photos = principalData.photos;

                    setValue('profileName', characterization.profileName || '');
                }

                setValue('name', name || '');
                setValue('type', type);
                setValue('noiseValue', characterization.noiseValue || '');
                setValue('temperature', characterization.temperature || '');
                setValue('luminosity', characterization.luminosity || '');
                setValue('moisturePercentage', characterization.moisturePercentage || '');
                setValue('description', characterization.description || '');

                setForm({
                    id: characterization.id,
                    profileParentId: characterization.profileParentId,
                    workspaceId: characterization.workspaceId,
                    photos: photos.map((photo: CharacterizationPhotoModel) => ({ uri: photo.photoUrl, id: photo.id })),
                    profileName: characterization.profileName,
                    riskData: riskData.map((rd) => ({
                        id: rd.id,
                        riskId: rd.riskId,
                        probability: rd.probability,
                        probabilityAfter: rd.probabilityAfter,
                    })),
                    hierarchies: hierarchies.map((h) => ({ id: h.id })),
                    employees: employees.map((h) => ({ id: h.id })),
                });
            } else {
                const type = route.params.type;

                if (type) setValue('type', type);
            }
        },
        [route.params.id, route.params.type, setValue],
    );

    useEffect(() => {
        getCharacterization();
    }, [getCharacterization]);

    const onChangeProfile = useCallback(
        async (characterzationId: string) => {
            await onSaveForm({ skipGoBack: true });
            getCharacterization({ characterizationId: characterzationId, principalProfileId: principalProfileId });
        },
        [getCharacterization, onSaveForm, principalProfileId],
    );

    const onAddProfile = useCallback(async () => {
        try {
            const characterization = await onSaveForm({ skipGoBack: true });
            if (characterization) {
                const action = async (v: string) => {
                    const characterizationRepo = new CharacterizationRepository();
                    const profile = await characterizationRepo.create({
                        name: characterization.name + `(${v})`,
                        type: characterization.type,
                        description: '',
                        profileParentId: characterization.id,
                        profileName: v,
                        workspaceId: route.params.workspaceId,
                        userId: user.id,
                        riskData: form.riskData,
                        // photos: form.photos?.map((photo) => ({ photoUrl: photo.uri, id: photo.id })),
                        // hierarchiesIds: form.hierarchies?.map((h) => h.id),
                    });

                    refetchProfiles();
                    getCharacterization({ characterizationId: profile.id, principalProfileId: characterization.id });
                };

                Alert.prompt('Novo Perfil', 'Informe o nome do perfil adicional?', [
                    {
                        text: 'Cancelar',
                        style: 'cancel',
                    },
                    {
                        text: 'Criar perfil',
                        onPress: (v) => v && action(v),
                    },
                ]);
            }
        } catch (e) {
            console.error(e);
        }
    }, [form.riskData, getCharacterization, onSaveForm, refetchProfiles, route.params.workspaceId, user.id]);

    if (characterizationId && !form.id) {
        return <SLoading />;
    }

    return (
        <>
            <Stack.Navigator initialRouteName="formCharacterization">
                <Stack.Screen name="formCharacterization" options={{ headerShown: false }}>
                    {({ navigation }: FormCharacterizationScreenProps) => (
                        <CharacterizationTabView
                            control={control}
                            onEditForm={onEditForm}
                            onSaveForm={onSaveForm}
                            openCamera={openCamera}
                            onGoBack={onGoBack}
                            onClickRisk={onClickRisk}
                            onClickHierarchy={onClickHierarchy}
                            onClickEmployee={onClickEmployee}
                            onAddRisk={onRiskDataSave}
                            form={form}
                            isLoading={isLoading}
                            profilesProps={{
                                characterizationsProfiles,
                                isLoadingProfiles,
                                principalProfileId,
                                onChangeProfile,
                                isPrincipalProfile,
                                onAddProfile,
                            }}
                            isEdit={!!characterizationId}
                            {...(characterizationId && {
                                onDeleteForm: onDeleteForm,
                            })}
                        />
                    )}
                </Stack.Screen>
                <Stack.Screen name="cameraCharacterization" options={{ headerShown: false }}>
                    {({ route, navigation }: FormCharacterizationScreenProps) => (
                        <CameraPage
                            onCancel={navigation.goBack}
                            onSave={(props) => {
                                onCameraSave(props);
                                navigation.goBack();
                            }}
                        />
                    )}
                </Stack.Screen>
                <Stack.Screen name="formRiskData" options={{ headerShown: false }}>
                    {({ navigation, route: riskRoute }: FormCharacterizationScreenProps) => (
                        <RiskDataPage
                            onSaveForm={onRiskDataSave}
                            onGoBack={navigation.goBack}
                            initFormData={riskRoute.params}
                            isEdit={!!characterizationId}
                            onDeleteForm={onRiskDataDelete}
                        />
                    )}
                </Stack.Screen>
            </Stack.Navigator>
            <SLoadingPage isLoading={isLoading} />
        </>
    );
}
