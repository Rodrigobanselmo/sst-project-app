import * as MediaLibrary from 'expo-media-library';
import { File, Paths } from 'expo-file-system/next';

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

// Custom error class for file not found
export class FileNotFoundError extends Error {
    constructor(uri: string) {
        super(`File not found: ${uri}`);
        this.name = 'FileNotFoundError';
    }
}

// Helper function to convert ph:// or content:// URIs to file:// URIs
async function getFileUri(uri: string): Promise<string> {
    console.log('🔍 getFileUri input:', uri);

    // If it's already a file:// URI, verify it exists and return
    if (uri.startsWith('file://')) {
        try {
            const file = new File(uri);
            if (file.exists) {
                console.log('✅ File exists:', uri);
                return uri;
            } else {
                console.warn('⚠️ File does not exist:', uri);
                throw new FileNotFoundError(uri);
            }
        } catch (error) {
            if (error instanceof FileNotFoundError) {
                throw error;
            }
            console.error('Error checking file existence:', error);
            throw new FileNotFoundError(uri);
        }
    }

    // For ph:// URIs (iOS Photos Library), we need to get the local URI
    if (uri.startsWith('ph://')) {
        try {
            const assetId = uri.slice(5);
            const asset = await MediaLibrary.getAssetInfoAsync(assetId);
            if (asset.localUri) {
                // Remove any fragment from localUri (iOS adds metadata fragments)
                const cleanLocalUri = asset.localUri.split('#')[0];
                console.log('✅ Resolved ph:// to:', cleanLocalUri);
                return cleanLocalUri;
            }
        } catch (error) {
            console.error('Error getting asset info for ph:// URI:', error);
        }
    }

    // For content:// URIs (Android), copy to cache directory
    if (uri.startsWith('content://')) {
        try {
            const filename = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const destPath = `${Paths.cache.uri}/${filename}`;
            const sourceFile = new File(uri);
            const destFile = new File(destPath);
            sourceFile.copy(destFile);
            console.log('✅ Copied content:// to:', destPath);
            return destPath;
        } catch (error) {
            console.error('Error copying content:// URI:', error);
        }
    }

    // Return original URI as fallback
    console.log('⚠️ Using original URI as fallback:', uri);
    return uri;
}

export async function getFormFileFromURI(
    fileUri: string,
    options?: { filename?: string },
): Promise<{ name: string; type: string; uri: string } | null> {
    // Convert non-file:// URIs to file:// URIs for upload compatibility
    let uploadableUri: string;
    try {
        uploadableUri = await getFileUri(fileUri);
    } catch (error) {
        if (error instanceof FileNotFoundError) {
            console.warn('⚠️ Skipping file - not found:', fileUri);
            return null;
        }
        throw error;
    }

    // Remove any fragment (e.g. #metadata) from the URI
    const cleanUri = uploadableUri.split('#')[0];

    const uriParts = cleanUri.split('/');
    const originalFilename = uriParts.pop() || 'file';
    const extensionMatch = /\.(\w+)$/.exec(originalFilename);
    let extension = extensionMatch ? extensionMatch[1] : '';

    // Handle expo-audio recordings which may not have extension
    // The default format on iOS is .caf, on Android is .m4a
    if (!extension && (fileUri.includes('recording-') || fileUri.includes('Recording'))) {
        extension = 'm4a';
    }

    console.log('📁 getFormFileFromURI:', { fileUri, uploadableUri: cleanUri, originalFilename, extension });

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
        case 'm4a':
            mimeType = 'audio/mp4';
            break;
        case 'caf':
            mimeType = 'audio/x-caf';
            break;
        // Add more cases as needed
    }

    // Ensure filename has proper extension
    let filename = options?.filename || originalFilename || `file.${extension}`;
    if (extension && !filename.endsWith(`.${extension}`)) {
        filename = `${filename}.${extension}`;
    }

    console.log('📁 Final file object:', { name: filename, type: mimeType, uri: cleanUri });

    return {
        name: filename,
        type: mimeType,
        uri: cleanUri,
    } as any;
}
