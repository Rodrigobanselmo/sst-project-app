import { SBox, SCenter, SFlatList, SHStack, SScrollView, SSpinner, SText, SVStack } from '@components/core';
import React from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { CharacterizationFormProps } from '../../types';
// import * as ImagePicker from 'expo-image-picker';
import PhotoEditor from '@baronha/react-native-photo-editor';
import { SButton, SInput, SInputArea } from '@components/index';
import { SHorizontalMenuScroll } from '@components/modelucules/SHorizontalMenuScroll';
import { SLabel } from '@components/modelucules/SLabel';
import { SRadio } from '@components/modelucules/SRadio';
import { SAFE_AREA_PADDING, SCREEN_WIDTH, pagePadding, pagePaddingPx } from '@constants/constants';
import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { characterizationMap } from '@constants/maps/characterization.map';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { deleteImageOrVideoFromGallery } from '@utils/helpers/saveAsset';
import * as ImagePickerExpo from 'expo-image-picker';
import { Orientation } from 'expo-screen-orientation';
import { Control, Controller } from 'react-hook-form';
import ImagePicker from 'react-native-image-crop-picker';
import { ICharacterizationValues } from '../../schemas';
import { PhotoComponent } from './PhotoComponent';
import SAudioRecorder from '@components/modelucules/SAudioRecording/SAudioRecording';
import SVideoRecorder from '@components/modelucules/SVideoRecorder/SVideoRecorder';

type PageProps = {
    openCamera: () => void;
    selectedId?: string;
    photos?: CharacterizationFormProps['photos'];
    audios?: CharacterizationFormProps['audios'];
    videos?: CharacterizationFormProps['videos'];
    onEditForm: (form: Partial<CharacterizationFormProps>) => void;
    onSaveForm: () => Promise<any>;
    control: Control<ICharacterizationValues, any>;
    profilesProps: {
        characterizationsProfiles?: CharacterizationModel[];
        isLoadingProfiles?: boolean;
        principalProfileId?: string;
        onChangeProfile?: (characterzationId: string) => Promise<void>;
        onAddProfile?: () => Promise<void>;
        isPrincipalProfile?: boolean;
    };
};

export const GALLERY_IMAGE_Width = 300;
export const GALLERY_IMAGE_PORTRAIT_WIDTH = (((GALLERY_IMAGE_Width * 9) / 16) * 9) / 16;
export const GALLERY_IMAGE_HEIGHT = (GALLERY_IMAGE_Width * 9) / 16;

export function CharacterizationForm({
    openCamera,
    onEditForm,
    onSaveForm,
    photos,
    audios,
    videos,
    control,
    selectedId,
    profilesProps: {
        principalProfileId,
        characterizationsProfiles,
        isLoadingProfiles,
        onChangeProfile,
        onAddProfile,
        isPrincipalProfile,
    },
}: PageProps): React.ReactElement {
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
            console.error(error);
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

            if (image[0].uri) deleteImageOrVideoFromGallery(image[0].uri);

            onEditForm({ photos: updatedImages });
        };

        Alert.alert('Deletar imagem', 'Tem certeza que deseja deletar essa imagem?', [
            { text: 'Voltar', style: 'cancel' },
            { text: 'Deletar', onPress: deleteImage, style: 'destructive' },
        ]);
    };

    const handleSave = () => {
        onSaveForm();
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
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <SVStack flex={1}>
                <SScrollView
                    style={{ paddingTop: 15 }}
                    contentContainerStyle={{ paddingBottom: 80 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* NAME & TYPE */}
                    <SVStack mx={pagePadding}>
                        {/* <SLabel>Dados</SLabel> */}
                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, value }, formState: { errors } }) => (
                                <SInput
                                    inputProps={{
                                        placeholder: '',
                                        keyboardType: 'default',
                                        autoCapitalize: 'none',
                                        value,
                                        onChangeText: onChange,
                                        // ...(!isEdit && {
                                        //     autoFocus: true,
                                        // }),
                                    }}
                                    isDisabled={!isPrincipalProfile}
                                    startAdornmentText="Nome"
                                    errorMessage={errors.name?.message}
                                />
                            )}
                        />

                        <SScrollView keyboardShouldPersistTaps="handled" horizontal>
                            <SHStack>
                                <SBox mr={5}>
                                    <Controller
                                        defaultValue={'' as any}
                                        control={control}
                                        name="type"
                                        render={({ field, formState: { errors } }) => (
                                            <SRadio
                                                isDisabled={!isPrincipalProfile}
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
                                </SBox>
                                <Controller
                                    defaultValue={'' as any}
                                    control={control}
                                    name="type"
                                    render={({ field, formState: { errors } }) => (
                                        <SRadio
                                            isDisabled={!isPrincipalProfile}
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
                            </SHStack>
                        </SScrollView>
                    </SVStack>

                    {/* PROFILE */}
                    <SVStack mx={pagePadding} mt={0}>
                        <SLabel mb={2}>Perfil</SLabel>

                        {isLoadingProfiles ? (
                            <SSpinner color="primary.main" size={32} />
                        ) : (
                            <SHorizontalMenuScroll
                                activeColor="gray.300"
                                mb={4}
                                paddingHorizontal={0}
                                onAddButtonChange={onAddProfile}
                                onChange={(value) => value.value && onChangeProfile?.(value.value)}
                                options={[
                                    { value: principalProfileId || '', name: 'Principal' },
                                    ...(characterizationsProfiles || []).map((profile) => ({
                                        value: profile.id,
                                        name: profile.profileName || 'Novo Perfil',
                                    })),
                                ]}
                                getKeyExtractor={(item) => item.value}
                                getLabel={(item) => item.name}
                                getIsActive={(item) => item.value === selectedId}
                            />
                        )}

                        {!isPrincipalProfile && (
                            <Controller
                                control={control}
                                name="profileName"
                                render={({ field: { onChange, value }, formState: { errors } }) => (
                                    <SInput
                                        inputProps={{
                                            placeholder: '',
                                            keyboardType: 'default',
                                            autoCapitalize: 'none',
                                            value,
                                            onChangeText: onChange,
                                        }}
                                        startAdornmentText="Nome do perfil"
                                        errorMessage={errors.profileName?.message}
                                    />
                                )}
                            />
                        )}
                    </SVStack>

                    {/* PHOTO */}
                    <>
                        <SHStack mb={3} mt={2}>
                            <SLabel mb={0} mr={2} ml={pagePadding}>
                                Fotos
                            </SLabel>

                            {photos && photos.length > 1 && (
                                <SCenter px={2} borderRadius={10} bg="#00000044">
                                    <SText fontSize={12} color="white">
                                        {photos.length}
                                    </SText>
                                </SCenter>
                            )}
                        </SHStack>

                        <SCenter style={styles.galleryContainer}>
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
                                <SFlatList
                                    // keyboardShouldPersistTaps={'handled'}
                                    data={photos || []}
                                    ItemSeparatorComponent={() => <SBox style={{ height: 10 }} />}
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
                                            orientation={item.orientation || Orientation.LANDSCAPE_LEFT}
                                            uri={item.uri}
                                        />
                                    )}
                                    horizontal
                                    keyExtractor={(item, index) => index.toString()}
                                    showsVerticalScrollIndicator={false}
                                    showsHorizontalScrollIndicator={false}
                                />
                            )}
                        </SCenter>

                        <SHStack justifyContent="center" mt={3}>
                            <SButton
                                mr={2}
                                variant="outline"
                                w="30%"
                                title="Galeria"
                                onPress={handlePickImage}
                                addColor
                            />
                            <SButton w="30%" title="Tirar Foto" onPress={openCamera} addColor />
                        </SHStack>
                    </>

                    {/* PARAMETHERS */}
                    <SVStack mx={pagePadding} mt={5}>
                        <SLabel>Parâmetros ambientais</SLabel>
                        <SHStack>
                            <SBox flex={1} mr={4}>
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
                                            errorMessage={errors.temperature?.message}
                                        />
                                    )}
                                />
                            </SBox>
                            <SBox flex={1}>
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
                                            errorMessage={errors.noiseValue?.message}
                                        />
                                    )}
                                />
                            </SBox>
                        </SHStack>
                        <SHStack>
                            <SBox flex={1} mr={4}>
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
                                            errorMessage={errors.moisturePercentage?.message}
                                        />
                                    )}
                                />
                            </SBox>
                            <SBox flex={1}>
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
                                            errorMessage={errors.luminosity?.message}
                                        />
                                    )}
                                />
                            </SBox>
                        </SHStack>
                    </SVStack>

                    {/* DESCRIPTION */}
                    <SVStack mt={3} mx={pagePadding}>
                        {/* <SLabel mr={2}>Descrição</SLabel> */}
                        <Controller
                            control={control}
                            name="description"
                            render={({ field: { onChange, value }, formState: { errors } }) => (
                                <SInputArea
                                    inputProps={{
                                        placeholder: '',
                                        keyboardType: 'default',
                                        value,
                                        onChangeText: onChange,
                                    }}
                                    h={300}
                                    startAdornmentText="Descrição"
                                    errorMessage={errors.description?.message}
                                />
                            )}
                        />
                    </SVStack>

                    <SAudioRecorder
                        audios={audios?.map((audio) => audio.uri) || []}
                        setAudios={(audios) => onEditForm({ audios: audios.map((audio) => ({ uri: audio })) })}
                    />
                    <SVideoRecorder
                        videos={videos?.map((video) => video.uri) || []}
                        setVideos={(videos) => onEditForm({ videos: videos.map((video) => ({ uri: video })) })}
                    />

                    <SVStack mb={SAFE_AREA_PADDING.paddingBottom} mt={5} mx={pagePadding}>
                        <SButton size={'sm'} title="Salvar" onPress={handleSave} />
                    </SVStack>
                </SScrollView>
            </SVStack>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    galleryContainer: {
        width: '100%',
    },
});
