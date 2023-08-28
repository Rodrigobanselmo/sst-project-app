import React, { useCallback, useEffect, useState } from 'react';
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

const Stack = createNativeStackNavigator<FormCharacterizationRoutesProps>();

export const GALLERY_IMAGE_Width = 300;
export const GALLERY_IMAGE_PORTRAIT_WIDTH = (((GALLERY_IMAGE_Width * 9) / 16) * 9) / 16;
export const GALLERY_IMAGE_HEIGHT = (GALLERY_IMAGE_Width * 9) / 16;

export function Characterization({ navigation, route }: CharacterizationPageProps): React.ReactElement {
    const [form, setForm] = useState({} as CharacterizationFormProps);
    const { user } = useAuth();

    const { control, trigger, getValues, setValue } = useForm<ICharacterizationValues>({
        resolver: yupResolver(characterizationSchema),
    });

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

    const onEditForm = useCallback((formValues: Partial<CharacterizationFormProps>) => {
        setForm((prev) => ({ ...prev, ...formValues }));
    }, []);

    const onRiskDataSave = useCallback(
        async (formValues: RiskDataFormProps) => {
            try {
                if (route.params?.id && formValues.id) {
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
        [route.params?.id],
    );

    const onRiskDataDelete = useCallback(
        async (formValues: RiskDataFormProps) => {
            if (route.params?.id && formValues.id) {
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
        [route.params?.id],
    );

    const onGoBack = useCallback(() => {
        navigation.navigate('characterizations', { workspaceId: route.params.workspaceId });
    }, [navigation, route.params.workspaceId]);

    const onDeleteForm = useCallback(async () => {
        if (route.params?.id) {
            const characterizationRepo = new CharacterizationRepository();
            await characterizationRepo.delete(route.params.id);
            navigation.navigate('characterizations', { workspaceId: route.params.workspaceId });
        }
    }, [navigation, route.params.id, route.params.workspaceId]);

    const onSaveForm = useCallback(async () => {
        const isValid = await trigger(['name', 'type']);

        if (isValid) {
            const { name, type, noiseValue, temperature, luminosity, description, moisturePercentage } = getValues();

            const characterizationRepo = new CharacterizationRepository();
            if (route.params?.id) {
                await characterizationRepo.update(route.params.id, {
                    name: name as string,
                    type,
                    noiseValue,
                    temperature,
                    luminosity,
                    description,
                    moisturePercentage,
                    photos: form.photos?.map((photo) => ({ photoUrl: photo.uri, id: photo.id })),
                });
            } else {
                await characterizationRepo.create({
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
                });
            }

            navigation.navigate('characterizations', { workspaceId: route.params.workspaceId });
        }
    }, [
        trigger,
        getValues,
        route.params.id,
        route.params.workspaceId,
        navigation,
        form.photos,
        form.riskData,
        user.id,
    ]);

    const getCharacterization = useCallback(async () => {
        const id = route.params?.id;

        if (id) {
            const characterizationRepo = new CharacterizationRepository();
            const { characterization, photos, riskData } = await characterizationRepo.findOne(id);

            setValue('name', characterization.name);
            setValue('type', characterization.type);
            setValue('noiseValue', characterization.noiseValue);
            setValue('temperature', characterization.temperature);
            setValue('luminosity', characterization.luminosity);
            setValue('moisturePercentage', characterization.moisturePercentage);
            setValue('description', characterization.description);

            setForm({
                id: characterization.id,
                workspaceId: characterization.workspaceId,
                photos: photos.map((photo: CharacterizationPhotoModel) => ({ uri: photo.photoUrl, id: photo.id })),
                riskData: riskData.map((rd) => ({
                    id: rd.id,
                    riskId: rd.riskId,
                    probability: rd.probability,
                    probabilityAfter: rd.probabilityAfter,
                })),
            });
        } else {
            const type = route.params?.type;

            if (type) setValue('type', type);
        }
    }, [route.params?.id, route.params?.type, setValue]);

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

    useEffect(() => {
        getCharacterization();
    }, [getCharacterization]);

    if (route.params?.id && !form.id) {
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
                            onAddRisk={onRiskDataSave}
                            form={form}
                            isEdit={!!route.params?.id}
                            {...(route.params?.id && {
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
                            isEdit={!!route.params?.id}
                            onDeleteForm={onRiskDataDelete}
                        />
                    )}
                </Stack.Screen>
            </Stack.Navigator>
        </>
    );
}
