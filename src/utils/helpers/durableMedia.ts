import { Directory, File, Paths } from 'expo-file-system/next';
import { randomUUID } from 'expo-crypto';
import * as MediaLibrary from 'expo-media-library';
import { createVisitMediaPersistence } from './durableMedia.core';

const directory = new Directory(Paths.document, 'visit-media');

export const persistVisitMedia = createVisitMediaPersistence({
    directory: directory.uri,
    uuid: randomUUID,
    prepare: () => directory.create({ intermediates: true, idempotent: true }),
    resolve: async (uri) => {
        if (uri.startsWith('ph://')) {
            const asset = await MediaLibrary.getAssetInfoAsync(uri.slice(5));
            if (!asset.localUri) throw new Error('Não foi possível recuperar o arquivo da galeria.');
            return asset.localUri.split('#')[0];
        }
        if (uri.startsWith('/')) return `file://${uri}`;
        if (!/^(file|content):\/\//.test(uri)) throw new Error('Formato de arquivo local não suportado.');
        return uri.split('#')[0];
    },
    stat: (uri) => {
        const file = new File(uri);
        return { exists: file.exists, size: file.exists ? file.size : undefined };
    },
    copy: (source, destination) => new File(source).copy(new File(destination)),
});
