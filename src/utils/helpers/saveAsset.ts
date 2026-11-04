import * as MediaLibrary from 'expo-media-library';
import { ALBUM_NAME, ALBUM_NAME_VIDEO } from '@constants/constants';

export const saveImageOrVideoToGallery = async (uri: string) => {
    const isVideo = uri.includes('.mp4') || uri.includes('.mov');
    const albumName = isVideo ? ALBUM_NAME_VIDEO : ALBUM_NAME;

    try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
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
        console.error(error);
    }
};
