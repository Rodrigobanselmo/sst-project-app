import { Zip, ZipPassThrough, strToU8 } from 'fflate';
import { SyncDocument } from './types';

export interface BackupIO {
    stat(uri: string): Promise<{ exists: boolean; size: number }>;
    openInput(uri: string): { read(length: number): Uint8Array; close(): void };
    createOutput(): { uri: string; write(bytes: Uint8Array): void; close(): void; discard(): void };
    yield?: () => Promise<void>;
}
/** Streams original binaries, without base64 or reading a video into JS memory. Does not delete any source. */
export async function writeVisitBackup(document: SyncDocument, io: BackupIO) {
    const uris = new Set<string>();
    const find = (value: any, key = '') => {
        // Watermelon stores these fields as JSON text. A removed visit keeps
        // its original raw row in sourceSnapshot, including that representation.
        if (typeof value === 'string' && ['audios', 'videos'].includes(key)) {
            try { find(JSON.parse(value)); } catch { /* Preserve malformed metadata in coleta.json. */ }
        }
        else if (typeof value === 'string' && ['uri', 'photoUrl'].includes(key) && /^(file|content|ph):\/\//.test(value)) uris.add(value);
        else if (Array.isArray(value)) value.forEach((item) => find(item));
        else if (value && typeof value === 'object') Object.entries(value).forEach(([child, item]) => find(item, child));
    };
    find(document);
    const files: { uri: string; archivePath: string; size: number; exists: boolean }[] = [];
    for (const uri of Array.from(uris)) {
        let stat = { exists: false, size: 0 };
        try { stat = await io.stat(uri); } catch { /* A missing file is explicit in the manifest, never silently omitted. */ }
        const extension = /\.([a-zA-Z0-9]{1,8})(?:[#?].*)?$/.exec(uri)?.[1] || 'bin';
        files.push({ uri, archivePath: `media/${files.length + 1}.${extension}`, ...stat });
    }
    const available = files.filter((file) => file.exists);
    if (available.length + 1 > 65535 || available.reduce((sum, file) => sum + file.size, 0) >= 0xffffffff) {
        throw new Error('A coleta excede o limite deste arquivo ZIP. Os dados e arquivos originais permanecem preservados no aparelho.');
    }
    const output = io.createOutput();
    let failure: Error | undefined;
    let complete = false;
    let written = 0;
    const zip = new Zip((error, bytes, final) => {
        if (error) { failure = error; return; }
        written += bytes.length;
        if (written >= 0xffffffff) throw new Error('A cópia excedeu o limite de 4 GB do ZIP. Nenhum arquivo original foi apagado.');
        output.write(bytes);
        if (final) complete = true;
    });
    try {
        const metadata = new ZipPassThrough('coleta.json');
        zip.add(metadata);
        metadata.push(strToU8(JSON.stringify({ backup: { format: 'SimpleSST mobile v1',
            containsMediaFiles: true, missingMedia: files.filter((file) => !file.exists).length },
            files, journal: document }, null, 2)), true);
        for (const file of files.filter((item) => item.exists)) {
            if (file.size >= 0xffffffff) throw new Error('Um arquivo excede o limite de 4 GB deste formato ZIP. As fontes foram preservadas.');
            const input = io.openInput(file.uri);
            try {
                const member = new ZipPassThrough(file.archivePath); zip.add(member);
                let remaining = file.size;
                let chunks = 0;
                if (!remaining) member.push(new Uint8Array(0), true);
                while (remaining > 0) {
                    const bytes = input.read(Math.min(64 * 1024, remaining));
                    if (!bytes.length || bytes.length > remaining) throw new Error('A leitura de um arquivo foi interrompida. Nenhuma fonte foi apagada.');
                    remaining -= bytes.length;
                    member.push(bytes, remaining === 0);
                    if (failure) throw failure;
                    if (++chunks % 32 === 0) await io.yield?.();
                }
            } finally { input.close(); }
        }
        zip.end();
        if (failure) throw failure;
        if (!complete) throw new Error('Não foi possível finalizar o arquivo da coleta.');
        output.close();
        return { uri: output.uri, archivedMedia: files.filter((file) => file.exists).length,
            missingMedia: files.filter((file) => !file.exists).length };
    } catch (error) {
        try { zip.terminate(); } catch { /* preserve original failure */ }
        try { output.close(); } catch { /* preserve original failure */ }
        try { output.discard(); } catch { /* never delete original media */ }
        throw error;
    }
}
