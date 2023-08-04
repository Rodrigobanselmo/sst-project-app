import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { ALBUM_NAME } from '@constants/constants';
import { isAndroid } from './getPlataform';

export const saveImageToGallery = async (uri: string) => {
    try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
            const asset = await MediaLibrary.createAssetAsync(uri);

            let album = await MediaLibrary.getAlbumAsync(ALBUM_NAME);
            if (!album) {
                album = await MediaLibrary.createAlbumAsync(ALBUM_NAME, asset);
            } else {
                await MediaLibrary.addAssetsToAlbumAsync([asset], album.id);
            }

            return asset;
        }
    } catch (error) {
        console.error(error);
    }
};

export const deleteImageToGallery = async (uri: string) => {
    try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
            if (!isAndroid()) {
                //TODO: to delete from editable pic album
                await MediaLibrary.removeAssetsFromAlbumAsync([uri], ALBUM_NAME);
            } else {
                // const fileInfo = await FileSystem.getInfoAsync(uri);
                // if (fileInfo.exists && !fileInfo.isDirectory) {
                //     await FileSystem.deleteAsync(uri, { idempotent: true });
                // }
            }

            return true;
        }
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const saveImageToStorage = async (imageUri: string) => {
    const documentDirectoryPath = FileSystem.documentDirectory + 'captured_image.jpg';

    try {
        await FileSystem.moveAsync({
            from: imageUri,
            to: documentDirectoryPath,
        });
        return documentDirectoryPath;
    } catch (error) {
        console.error('Error saving image:', error);
    }
};
