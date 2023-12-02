import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    CharacterizationFormProps,
    CharacterizationPageProps,
    FormCharacterizationRoutesProps,
    FormCharacterizationScreenProps,
    RiskDataFormProps,
} from './types';
// import * as ImagePicker from 'expo-image-picker';
import { SLoading } from '@components/modelucules';
import { SLoadingPage } from '@components/organisms/SLoadingPage';
import { useGetCharacterization } from '@hooks/database/useGetCharacterization';
import { useAuth } from '@hooks/useAuth';
import { useYupValidationResolver } from '@hooks/useYupValidationResolver';
import { IHierarchy } from '@interfaces/IHierarchy';
import { database } from '@libs/watermelon';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CharacterizationRepository } from '@repositories/characterizationRepository';
import { RiskDataRepository } from '@repositories/riskDataRepository';
import { CameraPage } from '@screens/Camera';
import { IImageGallery } from '@screens/Camera/types';
import { useForm } from 'react-hook-form';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Camera } from 'react-native-vision-camera';
import { CharacterizationTabView } from './components/Characterization/CharacterizationTabView';
import { RiskDataPage } from './components/RiskData/RiskDataPage';
import { ICharacterizationValues, characterizationSchema } from './schemas';
import { CharacterizationForm } from './components/Characterization/CharacterizationForm';
import { SLoadingPagePubSub } from '@components/organisms/SLoadingPage/SLoadingPagePubSub';
import { PubSubEventsEnum, pubSub } from '@utils/helpers/pubSub';

const Stack = createNativeStackNavigator<FormCharacterizationRoutesProps>();

export const GALLERY_IMAGE_Width = 300;
export const GALLERY_IMAGE_PORTRAIT_WIDTH = (((GALLERY_IMAGE_Width * 9) / 16) * 9) / 16;
export const GALLERY_IMAGE_HEIGHT = (GALLERY_IMAGE_Width * 9) / 16;

export function Characterization({ navigation, route }: CharacterizationPageProps): React.ReactElement {
    const [isLoading, setIsLoading] = useState(true);
    const saveRef = useRef(false);

    const resolver = useYupValidationResolver(characterizationSchema);
    const { control, trigger, getValues, setValue } = useForm<ICharacterizationValues>({
        resolver,
    });

    const [form, setForm] = useState({ workspaceId: route.params.workspaceId } as CharacterizationFormProps);
    const { user } = useAuth();

    const characterizationId = useMemo(() => form.id, [form.id]);

    const principalProfileId = useMemo(() => form.profileParentId || form.id, [form.id, form.profileParentId]);

    const isPrincipalProfile = useMemo(() => principalProfileId == form.id, [form.id, principalProfileId]);

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
            pubSub.publish(PubSubEventsEnum.LOADING_PAGE, true);
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
                            audios: form.audios || [],
                            videos: form.videos || [],
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
                            audios: form.audios || [],
                            videos: form.videos || [],
                        });
                    }

                    if (!options?.skipGoBack)
                        navigation.navigate('characterizations', { workspaceId: route.params.workspaceId });
                }
            } catch (error) {
                console.error(error);
            }

            saveRef.current = false;
            pubSub.publish(PubSubEventsEnum.LOADING_PAGE, false);
            return characterization;
        },
        [
            trigger,
            getValues,
            characterizationId,
            navigation,
            route.params.workspaceId,
            form.audios,
            form.videos,
            form.photos,
            form.riskData,
            form.hierarchies,
            form.employees,
            isPrincipalProfile,
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

    const openCamera = useCallback(async () => {
        try {
            const permissionResult = await Camera.requestCameraPermission();

            if (permissionResult === 'denied') {
                await Linking.openSettings();
                // alert('Você recusou permitir que este aplicativo acesse sua câmera!');
                return;
            }

            navigation.navigate('cameraCharacterization');
        } catch (error) {
            console.error(error);
        }
    }, [navigation]);

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
                } else if (characterizationId) {
                    const riskDataRepository = new RiskDataRepository();
                    await riskDataRepository.createRiskDataWithRecMedGs([formValues], characterizationId, user.id);
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
        [characterizationId, user.id],
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

    const onClickRisk = useCallback(
        async (risk: RiskModel) => {
            const riskData = form.riskData?.find((rd) => rd.riskId === risk.id);

            let params: RiskDataFormProps = {
                riskId: risk.id,
            };

            if (riskData) {
                params = { ...params, ...riskData };
            }

            navigation.navigate('formRiskData', params);
        },
        [form.riskData, navigation],
    );

    const onClickHierarchy = useCallback(
        async (hierarchy: IHierarchy) => {
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
        },
        [characterizationId, form?.hierarchies, user.id],
    );

    const onClickEmployee = useCallback(
        async (employee: EmployeeModel) => {
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
        },
        [characterizationId, form?.employees, user.id],
    );

    const getCharacterization = useCallback(
        async (options?: { characterizationId?: string; principalProfileId?: string }) => {
            const id = options?.characterizationId || route.params.id;
            pubSub.publish(PubSubEventsEnum.LOADING_PAGE, true);

            try {
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
                        photos: photos.map((photo: CharacterizationPhotoModel) => ({
                            uri: photo.photoUrl,
                            id: photo.id,
                        })),
                        profileName: characterization.profileName,
                        audios: characterization.audios ? JSON.parse(characterization.audios) : [],
                        videos: characterization.videos ? JSON.parse(characterization.videos) : [],
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
            } catch (error) {
                console.error(error);
            } finally {
                pubSub.publish(PubSubEventsEnum.LOADING_PAGE, false);
            }
        },
        [route.params.id, route.params.type, setValue],
    );

    useEffect(() => {
        getCharacterization().finally(() => setIsLoading(false));
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

    const isLoadingPage = (characterizationId && !form.id) || isLoadingProfiles || isLoading;
    if (isLoadingPage) {
        return <SLoading />;
    }

    console.log('char');

    return (
        <>
            <GestureHandlerRootView style={styles.root}>
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
            </GestureHandlerRootView>
        </>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
});
