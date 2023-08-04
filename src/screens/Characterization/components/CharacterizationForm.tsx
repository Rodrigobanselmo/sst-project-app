import { Box, Center, FlatList, HStack, ScrollView, Text, VStack } from '@components/core';
import React from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { CharacterizationFormProps } from '../types';
// import * as ImagePicker from 'expo-image-picker';
import PhotoEditor from '@baronha/react-native-photo-editor';
import { SButton, SInput, SInputArea, SScreenHeader } from '@components/index';
import { SLabel } from '@components/modelucules/SLabel';
import { SRadio } from '@components/modelucules/SRadio';
import { SAFE_AREA_PADDING, SCREEN_WIDTH, pagePadding, pagePaddingPx } from '@constants/constants';
import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { characterizationMap } from '@constants/maps/characterization.map';
import { deleteImageToGallery } from '@utils/helpers/saveImage';
import * as ImagePickerExpo from 'expo-image-picker';
import { Orientation } from 'expo-screen-orientation';
import { Control, Controller } from 'react-hook-form';
import ImagePicker from 'react-native-image-crop-picker';
import { ICharacterizationValues } from '../schemas';
import { PhotoComponent } from './PhotoComponent';

type PageProps = {
    openCamera: () => void;
    form: CharacterizationFormProps;
    onEditForm: (form: Partial<CharacterizationFormProps>) => void;
    control: Control<ICharacterizationValues, any>;
};

export const GALLERY_IMAGE_Width = 300;
export const GALLERY_IMAGE_PORTRAIT_WIDTH = (((GALLERY_IMAGE_Width * 9) / 16) * 9) / 16;
export const GALLERY_IMAGE_HEIGHT = (GALLERY_IMAGE_Width * 9) / 16;

export function CharacterizationForm({ openCamera, onEditForm, form, control }: PageProps): React.ReactElement {
    const { photos, isEdited } = form;

    const handlePickImage = async () => {
        try {
            const permissionResult = await ImagePickerExpo.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                alert(
                    'Você recusou acesso a sua galeria de fotos! Para abilitar acesse as configurações -> Simplesst --> Fotos',
                );
                return;
            }

            const images = await ImagePicker.openPicker({
                cropping: false,
                mediaType: 'photo',
                multiple: true,
            });

            const results: CharacterizationFormProps['photos'] = photos || [];
            for await (const image of images) {
                const img = await ImagePicker.openCropper({
                    mediaType: 'photo',
                    cropping: true,
                    path: image.path,
                    compressImageQuality: 0.6,
                    ...(image.height > image.width
                        ? {
                              width: (1200 * 9) / 16,
                              height: 1200,
                              compressImageMaxWidth: 900,
                          }
                        : {
                              width: 1200,
                              height: (1200 * 9) / 16,
                              compressImageMaxWidth: 1200,
                          }),
                });

                results.push({
                    uri: img.path,
                    orientation: image.height > image.width ? Orientation.PORTRAIT_UP : Orientation.LANDSCAPE_LEFT,
                });
            }

            onEditForm({ photos: results });
        } catch (error) {
            console.log(error);
        }
    };

    const handleEditImage = async (uri: string) => {
        const resultEdit = await PhotoEditor.open({ path: uri, stickers: [] });

        if (!resultEdit) return;

        const updatedImages = [...(photos || [])];
        const index = updatedImages.findIndex((image) => image.uri === uri);
        updatedImages[index] = { ...updatedImages[index], uri: resultEdit as string };

        onEditForm({ photos: updatedImages });
    };

    const handleDeleteImage = (index: number) => {
        const deleteImage = () => {
            const updatedImages = [...(photos || [])];
            const image = updatedImages.splice(index, 1);

            if (image[0].uri) deleteImageToGallery(image[0].uri);

            onEditForm({ photos: updatedImages });
        };

        Alert.alert('Deletar imagem', 'Tem certeza que deseja deletar essa imagem?', [
            { text: 'Voltar', style: 'cancel' },
            { text: 'Deletar', onPress: deleteImage, style: 'destructive' },
        ]);
    };

    const environments = [
        {
            label: 'Amb. ' + characterizationMap[CharacterizationTypeEnum.GENERAL].name,
            value: CharacterizationTypeEnum.GENERAL,
            // tooltip: characterizationMap[CharacterizationTypeEnum.GENERAL].description,
        },
        {
            label: 'Amb. ' + characterizationMap[CharacterizationTypeEnum.ADMINISTRATIVE].name,
            value: CharacterizationTypeEnum.ADMINISTRATIVE,
        },
        {
            label: 'Amb. ' + characterizationMap[CharacterizationTypeEnum.OPERATION].name,
            value: CharacterizationTypeEnum.OPERATION,
        },
        {
            label: 'Amb. ' + characterizationMap[CharacterizationTypeEnum.SUPPORT].name,
            value: CharacterizationTypeEnum.SUPPORT,
        },
    ];

    const characterization = [
        {
            label: characterizationMap[CharacterizationTypeEnum.WORKSTATION].name,
            value: CharacterizationTypeEnum.WORKSTATION,
        },
        {
            label: characterizationMap[CharacterizationTypeEnum.ACTIVITIES].name,
            value: CharacterizationTypeEnum.ACTIVITIES,
        },

        {
            label: characterizationMap[CharacterizationTypeEnum.EQUIPMENT].name,
            value: CharacterizationTypeEnum.EQUIPMENT,
        },
    ];

    return (
        <VStack flex={1}>
            <SScreenHeader isAlert={isEdited} title="Atividade" backButton navidateArgs={['task', {}]} />

            <ScrollView style={{ paddingTop: 12 }}>
                <VStack mx={pagePadding}>
                    <SLabel>Dados</SLabel>
                    <Controller
                        control={control}
                        name="name"
                        render={({ field: { onChange, value }, formState: { errors } }) => (
                            <SInput
                                inputProps={{
                                    placeholder: 'Nome',
                                    keyboardType: 'default',
                                    autoCapitalize: 'none',
                                    value,
                                    onChangeText: onChange,
                                }}
                                errorMessage={errors.name?.message}
                            />
                        )}
                    />
                    <ScrollView horizontal>
                        <HStack>
                            <Box mr={5}>
                                <Controller
                                    defaultValue={'' as any}
                                    control={control}
                                    name="type"
                                    render={({ field, formState: { errors } }) => (
                                        <SRadio
                                            value={field.value}
                                            sizeRadio={'sm'}
                                            name={field.name}
                                            onChange={(val) => field.onChange(val)}
                                            options={environments}
                                            errorMessage={errors.type?.message}
                                            accessibilityLabel="Tipo de ambiente"
                                        />
                                    )}
                                />
                            </Box>
                            <Controller
                                defaultValue={'' as any}
                                control={control}
                                name="type"
                                render={({ field, formState: { errors } }) => (
                                    <SRadio
                                        value={field.value}
                                        name={field.name}
                                        onChange={(val) => field.onChange(val)}
                                        sizeRadio={'sm'}
                                        options={characterization}
                                        errorMessage={errors.type?.message}
                                        accessibilityLabel="Outros tipo"
                                    />
                                )}
                            />
                        </HStack>
                    </ScrollView>
                </VStack>

                <HStack mb={3} mt={0}>
                    <SLabel mb={0} mr={2} ml={pagePadding}>
                        Fotos
                    </SLabel>

                    {photos && photos.length > 1 && (
                        <Center px={2} borderRadius={10} bg="#00000044">
                            <Text fontSize={12} color="white">
                                {photos.length}
                            </Text>
                        </Center>
                    )}
                </HStack>

                <Center style={styles.galleryContainer}>
                    {!photos?.length && (
                        <TouchableOpacity onPress={openCamera}>
                            <PhotoComponent
                                width={SCREEN_WIDTH - pagePaddingPx * 2}
                                orientation={Orientation.LANDSCAPE_LEFT}
                                uri={''}
                            />
                        </TouchableOpacity>
                    )}

                    {!!photos?.length && (
                        <FlatList
                            data={photos || []}
                            ItemSeparatorComponent={() => <Box style={{ height: 10 }} />}
                            contentContainerStyle={{
                                paddingHorizontal: 10,
                                gap: 10,
                            }}
                            renderItem={({ item, index }) => (
                                <PhotoComponent
                                    maxHeight={null}
                                    key={item.uri}
                                    handleEditImage={() => handleEditImage(item.uri)}
                                    handleDeleteImage={() => handleDeleteImage(index)}
                                    orientation={item.orientation}
                                    uri={item.uri}
                                />
                            )}
                            horizontal
                            keyExtractor={(item, index) => index.toString()}
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                        />
                    )}
                </Center>

                <HStack justifyContent="center" mt={3}>
                    <SButton mr={2} variant="outline" w="30%" title="Galeria" onPress={handlePickImage} addColor />
                    <SButton w="30%" title="Tirar Foto" onPress={openCamera} addColor />
                </HStack>

                <VStack mx={pagePadding}>
                    <Controller
                        control={control}
                        name="description"
                        render={({ field: { onChange, value }, formState: { errors } }) => (
                            <SInputArea
                                inputProps={{
                                    placeholder: 'Descrição',
                                    keyboardType: 'default',
                                    value,
                                    onChangeText: onChange,
                                }}
                                h={20}
                                errorMessage={errors.name?.message}
                            />
                        )}
                    />
                </VStack>

                <VStack mx={pagePadding}>
                    <SLabel>Parâmetros ambientais</SLabel>
                    <HStack>
                        <Box flex={1} mr={4}>
                            <Controller
                                control={control}
                                name="temperature"
                                render={({ field: { onChange, value }, formState: { errors } }) => (
                                    <SInput
                                        inputProps={{
                                            placeholder: 'Temperatura',
                                            keyboardType: 'numeric',
                                            value,
                                            onChangeText: onChange,
                                        }}
                                        endAdornmentText={'ºC'}
                                        errorMessage={errors.name?.message}
                                    />
                                )}
                            />
                        </Box>
                        <Box flex={1}>
                            <Controller
                                control={control}
                                name="noiseValue"
                                render={({ field: { onChange, value }, formState: { errors } }) => (
                                    <SInput
                                        inputProps={{
                                            placeholder: 'Ruído',
                                            keyboardType: 'numeric',
                                            value,
                                            onChangeText: onChange,
                                        }}
                                        endAdornmentText={'db (A)'}
                                        errorMessage={errors.name?.message}
                                    />
                                )}
                            />
                        </Box>
                    </HStack>
                    <HStack>
                        <Box flex={1} mr={4}>
                            <Controller
                                control={control}
                                name="moisturePercentage"
                                render={({ field: { onChange, value }, formState: { errors } }) => (
                                    <SInput
                                        inputProps={{
                                            placeholder: 'Humidade',
                                            keyboardType: 'numeric',
                                            value,
                                            onChangeText: onChange,
                                        }}
                                        endAdornmentText={'%'}
                                        errorMessage={errors.name?.message}
                                    />
                                )}
                            />
                        </Box>
                        <Box flex={1}>
                            <Controller
                                control={control}
                                name="luminosity"
                                render={({ field: { onChange, value }, formState: { errors } }) => (
                                    <SInput
                                        inputProps={{
                                            placeholder: 'Iluminância',
                                            keyboardType: 'numeric',
                                            value,
                                            onChangeText: onChange,
                                        }}
                                        endAdornmentText={'LUX'}
                                        errorMessage={errors.name?.message}
                                    />
                                )}
                            />
                        </Box>
                    </HStack>
                </VStack>

                <VStack mb={SAFE_AREA_PADDING.paddingBottom} mt={24} mx={pagePadding}>
                    <SButton size={'sm'} title="Salvar" onPress={handlePickImage} />
                </VStack>
            </ScrollView>
        </VStack>
    );
}

const styles = StyleSheet.create({
    galleryContainer: {
        width: '100%',
    },
});
