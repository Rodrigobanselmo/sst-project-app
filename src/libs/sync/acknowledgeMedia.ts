import { database } from '@libs/watermelon';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { CharacterizationRepository, IFileCharacterization } from '@repositories/characterizationRepository';
import { mediaKind, SyncJournal } from './journal';
/** A receipt only acknowledges the media version whose exact local URI was frozen for that operation. */
export async function acknowledgeMedia(journal: SyncJournal) {
    const repository = new CharacterizationRepository();
    for (const entry of (await journal.read()).entries) {
        if (!mediaKind(entry.operation.kind) || entry.receipt.state !== 'APPLIED') continue;
        const operation = entry.operation;
        const id = entry.receipt.result?.id || operation.entityId;
        try {
            if (operation.kind === 'PHOTO') {
                const photo = await database.get<CharacterizationPhotoModel>(DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO).find(operation.entityId);
                if (photo.photoUrl === operation.payload.uri && photo.apiId !== id) await repository.updatePhoto(photo.id, { apiId: id }, operation.payload.uri);
            } else {
                const parent = await database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION).find(operation.payload.characterizationId);
                const kind = operation.kind === 'AUDIO' ? 'audios' : 'videos';
                const files = JSON.parse(parent[kind] || '[]') as IFileCharacterization[];
                if (files.some((file) => file.uri === operation.payload.uri && file.apiId !== id)) {
                    await repository.updateFiles(parent.id, { [kind]: [{ uri: operation.payload.uri, apiId: id }] });
                }
            }
        } catch { /* Receipt remains durable; a later merge/retry can acknowledge a locally missing source. */ }
    }
}
