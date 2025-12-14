import { SBox, SCenter, SFlatList, SHStack, SText } from '@components/core';
import React from 'react';
import { Alert, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { CharacterizationFormProps } from '../../../types';
import PhotoEditor from '@baronha/react-native-photo-editor';
import { SButton } from '@components/index';
import { SLabel } from '@components/modelucules/SLabel';
import { SCREEN_WIDTH, pagePadding, pagePaddingPx } from '@constants/constants';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';
import { deleteImageOrVideoFromGallery } from '@utils/helpers/saveAsset';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Orientation } from 'expo-screen-orientation';
import { PhotoComponent } from '../PhotoComponent';

type FormProps = {
    openCamera: () => void;
    onEdit: (form: Partial<CharacterizationFormProps>) => void;
};

export function PhotoForm({ openCamera, onEdit }: FormProps): React.ReactElement {
    const photos = useCharacterizationFormStore((state) => state.form?.photos);

    const handlePickImage = async () => {
        try {
            // Android 13+ (API 33+) usa Photo Picker que NÃO requer permissões
            // Android 12 e inferior ainda precisa de permissões
            const needsPermission = Platform.OS === 'android' && Platform.Version < 33;

            if (needsPermission) {
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

                if (permissionResult.granted === false) {
                    alert(
                        'Você recusou acesso a sua galeria de fotos! Para abilitar acesse as configurações -> Simplesst --> Fotos',
                    );
                    return;
                }
            }

            // Usar expo-image-picker com allowsMultipleSelection
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                quality: 0.8,
                selectionLimit: 10, // Limite de 10 fotos
            });

            if (result.canceled) {
                return;
            }

            const results: CharacterizationFormProps['photos'] = [...(photos || [])];

            // Processar cada imagem selecionada
            for (const asset of result.assets) {
                const { width, height, uri } = asset;

                // Determinar orientação
                const isPortrait = height > width;
                const targetWidth = isPortrait ? (1200 * 9) / 16 : 1200;
                const targetHeight = isPortrait ? 1200 : (1200 * 9) / 16;

                // Fazer crop e compressão usando expo-image-manipulator
                const context = ImageManipulator.manipulate(uri);
                context.resize({
                    width: targetWidth,
                    height: targetHeight,
                });
                const image = await context.renderAsync();
                const manipulatedImage = await image.saveAsync({
                    compress: 0.6,
                    format: SaveFormat.JPEG,
                });

                results.push({
                    uri: manipulatedImage.uri,
                    orientation: isPortrait ? Orientation.PORTRAIT_UP : Orientation.LANDSCAPE_LEFT,
                });
            }

            onEdit({ photos: results });
        } catch (error) {
            console.info('Error', error);
        }
    };

    const handleEditImage = async (uri: string) => {
        const resultEdit = await PhotoEditor.open({ path: uri, stickers: [] });

        if (!resultEdit) return;

        const updatedImages = [...(photos || [])];
        const index = updatedImages.findIndex((image) => image.uri === uri);
        updatedImages[index] = { ...updatedImages[index], uri: resultEdit as string };

        onEdit({ photos: updatedImages });
    };

    const handleDeleteImage = (index: number) => {
        const deleteImage = () => {
            const updatedImages = [...(photos || [])];
            const image = updatedImages.splice(index, 1);

            if (image[0].uri) deleteImageOrVideoFromGallery(image[0].uri);

            onEdit({ photos: updatedImages });
        };

        Alert.alert('Deletar imagem', 'Tem certeza que deseja deletar essa imagem?', [
            { text: 'Voltar', style: 'cancel' },
            { text: 'Deletar', onPress: deleteImage, style: 'destructive' },
        ]);
    };

    return (
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
                        keyExtractor={(_item, index) => index.toString()}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                    />
                )}
            </SCenter>

            <SHStack justifyContent="center" mt={3}>
                <SButton mr={2} variant="outline" w="30%" title="Galeria" onPress={handlePickImage} addColor />
                <SButton w="30%" title="Tirar Foto" onPress={openCamera} addColor />
            </SHStack>
        </>
    );
}

const styles = StyleSheet.create({
    galleryContainer: {
        width: '100%',
    },
});
