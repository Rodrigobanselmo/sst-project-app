import React, { useCallback, useState } from 'react';
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

const Stack = createNativeStackNavigator<FormCharacterizationRoutesProps>();

export const GALLERY_IMAGE_Width = 300;
export const GALLERY_IMAGE_PORTRAIT_WIDTH = (((GALLERY_IMAGE_Width * 9) / 16) * 9) / 16;
export const GALLERY_IMAGE_HEIGHT = (GALLERY_IMAGE_Width * 9) / 16;

export function Characterization({ navigation, route }: CharacterizationPageProps): React.ReactElement {
    const [form, setForm] = useState({} as CharacterizationFormProps);

    const { control } = useForm<ICharacterizationValues>({
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
            console.log(error);
        }
    };

    const onCameraSave = useCallback(
        ({ photos }: { photos: IImageGallery[] }) => {
            setForm((prev) => ({ ...prev, photos: [...(prev.photos || []), ...photos] }));
            navigation.navigate('formCharacterization', {});
        },
        [navigation],
    );

    const onCameraCancel = useCallback(() => {
        navigation.navigate('formCharacterization', {});
    }, [navigation]);

    const onEditForm = useCallback((formValues: Partial<CharacterizationFormProps>) => {
        setForm((prev) => ({ ...prev, ...formValues }));
    }, []);

    return (
        <Stack.Navigator initialRouteName="formCharacterization">
            <Stack.Screen name="formCharacterization" options={{ headerShown: false }}>
                {({ route, navigation }: FormCharacterizationScreenProps) => (
                    <CharacterizationForm
                        control={control}
                        onEditForm={onEditForm}
                        openCamera={openCamera}
                        form={form}
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
