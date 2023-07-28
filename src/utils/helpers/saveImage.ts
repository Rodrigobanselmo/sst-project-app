import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

export const saveImageToGallery = async (uri: string) => {
    try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
            const albumName = 'SimpleSST';

            const asset = await MediaLibrary.createAssetAsync(uri);

            let album = await MediaLibrary.getAlbumAsync(albumName);
            if (!album) {
                album = await MediaLibrary.createAlbumAsync(albumName, asset);
            } else {
                await MediaLibrary.addAssetsToAlbumAsync([asset], album.id);
            }

            return asset;
        }
    } catch (error) {
        console.log(error);
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
        console.log('Error saving image:', error);
    }
};
