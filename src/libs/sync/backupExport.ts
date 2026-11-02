import { File, Paths } from 'expo-file-system/next';
import { writeVisitBackup } from './backup';
import { SyncDocument } from './types';
export function exportVisitArchive(document: SyncDocument) {
    return writeVisitBackup(document, {
        stat: async (uri) => { const file = new File(uri); return { exists: file.exists, size: file.exists ? file.size : 0 }; },
        openInput: (uri) => {
            const handle = new File(uri).open();
            return { read: (size) => handle.readBytes(size), close: () => handle.close() };
        },
        createOutput: () => {
            const file = new File(Paths.document, `coleta-${Date.now()}.zip`);
            file.create();
            const handle = file.open();
            return { uri: file.uri, write: (bytes) => handle.writeBytes(bytes), close: () => handle.close(), discard: () => file.delete() };
        },
        yield: () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
    });
}
