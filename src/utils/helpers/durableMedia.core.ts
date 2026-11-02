export type VisitMediaKind = 'photo' | 'audio' | 'video';

export type VisitMediaStorage = {
    directory: string;
    uuid: () => string;
    resolve: (uri: string) => Promise<string>;
    prepare: () => void;
    stat: (uri: string) => { exists: boolean; size?: number | null };
    copy: (source: string, destination: string) => void;
};

// Keep capture files outside the OS cache. Never remove the source: a failed
// copy must remain recoverable and existing pending operations may reference it.
export function createVisitMediaPersistence(storage: VisitMediaStorage) {
    return async (uri: string, kind: VisitMediaKind, options: { forceCopy?: boolean } = {}): Promise<string> => {
        const source = await storage.resolve(uri);
        const before = storage.stat(source);
        if (!before.exists || before.size === 0) throw new Error('Arquivo da coleta não encontrado ou vazio.');
        const directory = storage.directory.replace(/\/$/, '');
        if (!options.forceCopy && source.startsWith(`${directory}/`)) return source;
        const allowed = {
            photo: ['jpg', 'jpeg', 'png', 'heic', 'webp'],
            audio: ['m4a', 'caf', 'mp3', 'wav', 'aac', 'ogg', 'webm'],
            video: ['mov', 'mp4', 'm4v', 'webm'],
        };
        const originalExtension = source.split(/[?#]/)[0].match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();
        const extension = originalExtension && allowed[kind].includes(originalExtension)
            ? originalExtension : { photo: 'jpg', audio: 'm4a', video: 'mov' }[kind];
        storage.prepare();
        const destination = `${directory}/${kind}-${storage.uuid()}.${extension}`;
        storage.copy(source, destination);
        const after = storage.stat(destination);
        if (!after.exists || !after.size || (before.size != null && before.size !== after.size)) {
            throw new Error('Não foi possível guardar o arquivo completo. Libere espaço e tente novamente.');
        }
        return destination;
    };
}
