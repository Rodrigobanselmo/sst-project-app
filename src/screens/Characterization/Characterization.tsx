import React, { useCallback, useEffect, useState } from 'react';
import {
    CharacterizationFormProps,
    CharacterizationPageProps,
    FormCharacterizationRoutesProps,
    FormCharacterizationScreenProps,
} from './types';
// import * as ImagePicker from 'expo-image-picker';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CameraPage } from '@screens/Camera';
import { IImageGallery } from '@screens/Camera/types';
import * as ImagePickerExpo from 'expo-image-picker';
import { CharacterizationForm } from './components/CharacterizationForm';
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
import { SLoading } from '@components/modelucules';
import { CharacterizationRepository } from '@repositories/characterizationRepository';
import { CharacterizationTabView } from './components/CharacterizationTabView';

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

    const onCameraSave = useCallback(
        ({ photos }: { photos: IImageGallery[] }) => {
            setForm((prev) => ({ ...prev, photos: [...(prev.photos || []), ...photos] }));
            navigation.navigate('formCharacterization', { workspaceId: route.params.workspaceId });
        },
        [navigation, route.params.workspaceId],
    );

    const onCameraCancel = useCallback(() => {
        navigation.navigate('formCharacterization', { workspaceId: route.params.workspaceId });
    }, [navigation, route.params.workspaceId]);

    const onEditForm = useCallback((formValues: Partial<CharacterizationFormProps>) => {
        setForm((prev) => ({ ...prev, ...formValues }));
    }, []);

    const onGoBack = useCallback(() => {
        navigation.navigate('characterizations', { workspaceId: route.params.workspaceId });
    }, [navigation, route.params.workspaceId]);

    const onDeleteForm = useCallback(async () => {
        if (route.params?.id) {
            const repo = new CharacterizationRepository();
            await repo.delete(route.params.id);
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
                });
            }

            navigation.navigate('characterizations', { workspaceId: route.params.workspaceId });
        }
    }, [trigger, getValues, navigation, route.params.workspaceId, route.params.id, form.photos, user.id]);

    const getCharacterization = useCallback(async () => {
        const id = route.params?.id;

        if (id) {
            const repo = new CharacterizationRepository();
            const { characterization, photos } = await repo.findOne(id);

            setValue('name', characterization.name);
            setValue('type', characterization.type);
            setValue('noiseValue', characterization.noiseValue);
            setValue('temperature', characterization.temperature);
            setValue('luminosity', characterization.luminosity);
            setValue('moisturePercentage', characterization.moisturePercentage);
            setValue('description', characterization.description);

            setForm({
                id: characterization.id,
                photos: photos.map((photo: CharacterizationPhotoModel) => ({ uri: photo.photoUrl, id: photo.id })),
                workspaceId: characterization.workspaceId,
            });
        } else {
            const type = route.params?.type;

            if (type) setValue('type', type);
        }
    }, [route.params?.id, route.params?.type, setValue]);

    useEffect(() => {
        getCharacterization();
    }, [getCharacterization]);

    if (route.params?.id && !form.id) {
        return <SLoading />;
    }

    return (
        <Stack.Navigator initialRouteName="formCharacterization">
            <Stack.Screen name="formCharacterization" options={{ headerShown: false }}>
                {({ navigation }: FormCharacterizationScreenProps) => (
                    <CharacterizationTabView
                        control={control}
                        onEditForm={onEditForm}
                        onSaveForm={onSaveForm}
                        openCamera={openCamera}
                        onGoBack={onGoBack}
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
                    <CameraPage onCancel={onCameraCancel} onSave={onCameraSave} />
                )}
            </Stack.Screen>
        </Stack.Navigator>
    );
}
