import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

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

// const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
// const blob = new Blob([base64], { type: 'video/mp4' });

export async function getFormFileFromURI(fileUri: string, options?: { filename?: string }) {
    const uriParts = fileUri.split('/');
    const originalFilename = uriParts.pop() || 'file';
    const extensionMatch = /\.(\w+)$/.exec(originalFilename);
    const extension = extensionMatch ? extensionMatch[1] : '';

    let mimeType = 'application/octet-stream'; // Default to binary type
    switch (extension.toLowerCase()) {
        case 'jpg':
        case 'jpeg':
            mimeType = 'image/jpeg';
            break;
        case 'png':
            mimeType = 'image/png';
            break;
        case 'gif':
            mimeType = 'image/gif';
            break;
        case 'bmp':
            mimeType = 'image/bmp';
            break;
        case 'svg':
            mimeType = 'image/svg+xml';
            break;
        case 'mp4':
            mimeType = 'video/mp4';
            break;
        case 'mov':
            mimeType = 'video/quicktime';
            break;
        case 'avi':
            mimeType = 'video/x-msvideo';
            break;
        case 'wmv':
            mimeType = 'video/x-ms-wmv';
            break;
        case 'flv':
            mimeType = 'video/x-flv';
            break;
        case 'mp3':
            mimeType = 'audio/mpeg';
            break;
        case 'wav':
            mimeType = 'audio/wav';
            break;
        case 'aac':
            mimeType = 'audio/aac';
            break;
        case 'ogg':
            mimeType = 'audio/ogg';
            break;
        case 'webm':
            mimeType = 'audio/webm';
            break;
        case 'flac':
            mimeType = 'audio/flac';
            break;
        case 'txt':
            mimeType = 'text/plain';
            break;
        case 'pdf':
            mimeType = 'application/pdf';
            break;
        case 'doc':
        case 'docx':
            mimeType = 'application/msword';
            break;
        case 'xls':
        case 'xlsx':
            mimeType = 'application/vnd.ms-excel';
            break;
        case 'ppt':
        case 'pptx':
            mimeType = 'application/vnd.ms-powerpoint';
            break;
        case 'json':
            mimeType = 'application/json';
            break;
        case 'zip':
            mimeType = 'application/zip';
            break;
        case 'rar':
            mimeType = 'application/x-rar-compressed';
            break;
        // Add more cases as needed
    }

    const filename = options?.filename || originalFilename || `file.${extension}`;

    return {
        name: filename,
        type: mimeType,
        uri: fileUri,
    } as any;
}
