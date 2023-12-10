import * as MediaLibrary from 'expo-media-library';

export async function getAssetInfo(assetUri: string) {
    let assetId: string;
    if (assetUri.startsWith('ph://')) {
        assetId = assetUri.slice(5); // Remove the 'ph://' prefix for iOS
    } else if (assetUri.startsWith('content://') || assetUri.startsWith('file://')) {
        assetId = assetUri; // Use the URI directly for Android
    } else {
        throw new Error('Unsupported URI scheme');
    }

    const asset = await MediaLibrary.getAssetInfoAsync(assetId);

    return asset;
}
