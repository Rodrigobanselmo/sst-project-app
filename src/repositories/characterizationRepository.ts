import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { MeasuresTypeEnum, RecTypeEnum } from '@constants/enums/risk.enum';
import { StatusEnum } from '@constants/enums/status.enum';
import { database } from '@libs/watermelon';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import { GenerateSourceModel } from '@libs/watermelon/model/GenerateSourceModel';
import { RecMedModel } from '@libs/watermelon/model/RecMedModel';
import { RiskDataModel } from '@libs/watermelon/model/RiskDataModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { AdmsRiskDataModel } from '@libs/watermelon/model/_MMModel/AdmsRiskDataModel';
import { EngsRiskDataModel } from '@libs/watermelon/model/_MMModel/EngsRiskDataModel';
import { EpisRiskDataModel } from '@libs/watermelon/model/_MMModel/EpisRiskDataModel';
import { GenerateRiskDataModel } from '@libs/watermelon/model/_MMModel/GenerateRiskDataModel';
import { RecsRiskDataModel } from '@libs/watermelon/model/_MMModel/RecsRiskDataModel';
import { RiskDataFormSelectedProps } from '@screens/Characterization/types';
import uuidGenerator from 'react-native-uuid';
import { IRiskDataCreate, RiskDataRepository } from './riskDataRepository';
import { IHierarchyCreate } from './hierarchyRepository';
import { CharacterizationHierarchyModel } from '@libs/watermelon/model/_MMModel/CharacterizationHierarchyModel';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { Model, Q } from '@nozbe/watermelondb';
import { CharacterizationEmployeeModel } from '@libs/watermelon/model/_MMModel/CharacterizationEmployeeModel';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import { journalForSource } from '@libs/sync/sourceContext';
import { prepareDeletion } from '@libs/sync/storage';
import { baseKey } from '@libs/sync/journal';
import { parentFingerprint, parentTreeFingerprint } from '@libs/sync/sourceFingerprint';
import { SyncJournal } from '@libs/sync/journal';
import { SyncOperationModel } from '@libs/watermelon/model/SyncOperationModel';

interface IRecMedCreate {
    recName?: string;
    medName?: string;
    riskId: string;
    id: string;
    medType?: MeasuresTypeEnum;
    recType?: RecTypeEnum;
}

interface IGenerateSourceCreate {
    id: string;
    name: string;
    riskId: string;
}

export interface IFileCharacterization {
    uri: string;
    apiId?: string;
    id?: string;
}

export interface ICharacterizationPhoto {
    id?: string;
    apiId?: string;
    photoUrl: string;
    name?: string;
}
export interface ICharacterizationCreate {
    apiId?: string;
    id?: string;
    name: string;
    type: CharacterizationTypeEnum;
    description?: string;
    noiseValue?: string;
    temperature?: string;
    luminosity?: string;
    profileName?: string;
    profileParentId?: string;
    workspaceId: string;
    moisturePercentage?: string;
    userId: number;
    photos?: ICharacterizationPhoto[];
    riskData?: IRiskDataCreate[];
    hierarchiesIds?: string[];
    employeeIds?: string[];
    audios?: IFileCharacterization[];
    videos?: IFileCharacterization[];
    updatedAt?: Date;
    createdAt?: Date;
    done_at?: Date;
    status?: StatusEnum;
}

export class CharacterizationRepository {
    constructor() {}

    async findMany({ userId }: { userId: number }) {
        const userTable = database.get<UserAuthModel>(DBTablesEnum.USER_AUTH);
        const user = await userTable.find(String(userId));

        const characterizations: CharacterizationModel[] = await (user?.characterizations as any)?.fetch();

        return { characterizations };
    }

    async findByIds({ ids }: { ids: string[] }) {
        const characterizationCollection = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);
        const characterizations = await characterizationCollection.query(Q.where('id', Q.oneOf(ids)));

        return { characterizations };
    }

    async findList({ workspaceId }: { workspaceId: string }) {
        const characterizationCollection = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);
        const characterizations = await characterizationCollection
            .query(Q.where('profileParentId', Q.eq(null)), Q.where('workspaceId', workspaceId), Q.where('status', Q.notEq(StatusEnum.INACTIVE)))
            .fetch();

        return { characterizations };
    }

    async findAllByWorkspace({ workspaceId, userId }: { workspaceId: string; userId: number }) {
        const characterizationCollection = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);
        const characterizations = await characterizationCollection
            .query(Q.where('workspaceId', workspaceId), Q.where('user_id', String(userId)))
            .fetch();

        return { characterizations };
    }

    async findByProfileId({ profileId }: { profileId: string }) {
        const characterizationCollection = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);
        const characterizations = await characterizationCollection.query(Q.where('profileParentId', profileId), Q.where('status', Q.notEq(StatusEnum.INACTIVE))).fetch();

        return { characterizations };
    }

    async findOne(id: string) {
        const characterizationCollection = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);

        const characterization = await characterizationCollection.find(id);

        const [photos, riskData, hierarchies, employees]: [
            CharacterizationPhotoModel[],
            RiskDataModel[],
            HierarchyModel[],
            EmployeeModel[],
        ] = await Promise.all([
            (characterization?.photos as any)?.fetch(),
            (characterization?.riskData as any)?.fetch(),
            (characterization?.hierarchies as any)?.fetch(),
            (characterization?.employees as any)?.fetch(),
        ]);

        return { characterization, photos: photos.filter((photo) => !photo.deleted_at), riskData: riskData.filter((risk) => !risk.deleted_at), hierarchies, employees };
    }

    async create(data: ICharacterizationCreate) {
        const riskDataRepository = new RiskDataRepository();
        const characterizationTable = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);

        const characterizationPhotoTable = database.get<CharacterizationPhotoModel>(
            DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO,
        );

        return await database.write(async () => {
            if (data.riskData) {
                data.riskData = await riskDataRepository.createRecMedGS(data.riskData, data.userId);
            }

            const newCharacterization = await characterizationTable.create((characterization) => {
                characterization._raw.id = data.id || (uuidGenerator.v4() as string);
                characterization.apiId = data.apiId;
                characterization.name = data.name;
                characterization.userId = String(data.userId);
                characterization.description = data.description;
                characterization.type = data.type;
                characterization.noiseValue = data.noiseValue;
                characterization.temperature = data.temperature;
                characterization.luminosity = data.luminosity;
                characterization.profileParentId = data.profileParentId;
                characterization.profileName = data.profileName;
                characterization.moisturePercentage = data.moisturePercentage;
                characterization.workspaceId = data.workspaceId;
                characterization.status = StatusEnum.ACTIVE;
                characterization.created_at = data.createdAt || new Date();
                characterization.updated_at = data.updatedAt || new Date();
                characterization.done_at = data.done_at ? new Date(data.done_at) : undefined;
                characterization.audios = JSON.stringify(data.audios?.map((file) => ({ ...file, id: file.id || String(uuidGenerator.v4()) })));
                characterization.videos = JSON.stringify(data.videos?.map((file) => ({ ...file, id: file.id || String(uuidGenerator.v4()) })));
            });

            try {
                if (data.photos)
                    await Promise.all(
                        data.photos.map(async (photo) => {
                            await characterizationPhotoTable.create((newPhoto) => {
                                newPhoto.apiId = photo.apiId;
                                newPhoto.companyCharacterizationId = newCharacterization.id;
                                newPhoto.name = data.name;
                                newPhoto.photoUrl = photo.photoUrl;
                                newPhoto.created_at = new Date();
                                newPhoto.updated_at = new Date();
                            });
                        }),
                    );
            } catch (error) {
                console.error(error);
                throw error;
            }

            if (data.riskData) {
                await riskDataRepository.createRiskData(data.riskData, newCharacterization.id, data.userId);
            }
            if (data.hierarchiesIds) {
                await this.createMMHierarchy(data.hierarchiesIds, newCharacterization.id, data.userId);
            }
            if (data.employeeIds) {
                await this.createMMEmployee(data.employeeIds, newCharacterization.id, data.userId);
            }

            return newCharacterization;
        });
    }

    async update(id: string, data: Partial<ICharacterizationCreate>, expectedFingerprint?: string) {
        const source = await database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION).find(id);
        const mediaJournal = data.photos || data.audios || data.videos ? await journalForSource(source.workspaceId, Number(source.userId)) : undefined;
        const mediaDocument = mediaJournal ? await mediaJournal.read() : undefined;
        return await database.write(async () => {
            const characterizationTable = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);
            const characterizationPhotoTable = database.get<CharacterizationPhotoModel>(
                DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO,
            );

            try {
                const characterization = await characterizationTable.find(id);
                if (expectedFingerprint !== undefined && await parentFingerprint(characterization) !== expectedFingerprint) return undefined;
                const prepared: Model[] = [];
                let tombstones = 0;
                const removeMedia = async (kind: 'PHOTO_DELETE' | 'FILE_DELETE', mediaId: string, snapshot: Record<string, any>) => {
                    if (!mediaJournal) throw new Error('Não foi possível preservar a remoção deste arquivo.');
                    const dependency = [...(mediaDocument?.entries || [])].reverse().find((entry) =>
                        ['PHOTO', 'AUDIO', 'VIDEO'].includes(entry.operation.kind) && entry.operation.entityId === mediaId);
                    prepared.push(...await prepareDeletion(mediaJournal, { kind, entityId: mediaId,
                        payload: { characterizationId: id, sourceSnapshot: snapshot },
                        dependsOn: dependency ? [dependency.operation.operationId] : [] }, tombstones++));
                };
                for (const kind of ['audios', 'videos'] as const) if (data[kind]) {
                    const previous = JSON.parse(characterization[kind] || '[]') as IFileCharacterization[];
                    for (const file of previous) if (!data[kind]?.some((current) =>
                        (file.id && current.id === file.id) || current.uri === file.uri)) {
                        const existing = [...(mediaDocument?.entries || [])].reverse().find((entry) =>
                            entry.operation.payload.uri === file.uri && entry.operation.payload.characterizationId === id);
                        await removeMedia('FILE_DELETE', file.apiId || file.id || existing?.operation.entityId || String(uuidGenerator.v4()), { ...file });
                    }
                }
                prepared.push(characterization.prepareUpdate(() => {
                    if (data.apiId) characterization.apiId = data.apiId;
                    if (data.name !== undefined) characterization.name = data.name;
                    if (data.profileName !== undefined) characterization.profileName = data.profileName;
                    if (data.profileParentId !== undefined) characterization.profileParentId = data.profileParentId;
                    if (data.description !== undefined) characterization.description = data.description;
                    if (data.type) characterization.type = data.type;
                    if (data.status !== undefined) characterization.status = data.status;
                    if (data.noiseValue !== undefined) characterization.noiseValue = data.noiseValue;
                    if (data.temperature !== undefined) characterization.temperature = data.temperature;
                    if (data.luminosity !== undefined) characterization.luminosity = data.luminosity;
                    if (data.moisturePercentage !== undefined) characterization.moisturePercentage = data.moisturePercentage;
                    if (data.audios) characterization.audios = JSON.stringify(data.audios.map((file) => ({ ...file, id: file.id || String(uuidGenerator.v4()) })));
                    if (data.videos) characterization.videos = JSON.stringify(data.videos.map((file) => ({ ...file, id: file.id || String(uuidGenerator.v4()) })));
                    if (data.done_at !== undefined)
                        characterization.done_at = data.done_at ? new Date(data.done_at) : null;

                    characterization.updated_at = data.updatedAt || new Date();
                }));
                if (data.photos) {
                    const beforePhotos = (await (characterization.photos as any).fetch() as CharacterizationPhotoModel[]).filter((photo) => !photo.deleted_at);
                    for (const photo of beforePhotos) if (!data.photos.some((current) => current.id === photo.id)) {
                        await removeMedia('PHOTO_DELETE', photo.apiId || photo.id, { ...photo._raw, uri: photo.photoUrl });
                        prepared.push(photo.prepareUpdate((row) => { row.deleted_at = new Date(); row.updated_at = new Date(); }));
                    }
                    for (const photo of data.photos) {
                        const previous = beforePhotos.find((row) => row.id === photo.id);
                        if (previous && previous.photoUrl === photo.photoUrl) continue;
                        if (previous) {
                            await removeMedia('PHOTO_DELETE', previous.apiId || previous.id, { ...previous._raw, uri: previous.photoUrl });
                            prepared.push(previous.prepareUpdate((row) => { row.deleted_at = new Date(); row.updated_at = new Date(); }));
                        }
                        prepared.push(characterizationPhotoTable.prepareCreate((row) => {
                            row._raw.id = String(uuidGenerator.v4()); row.companyCharacterizationId = id;
                            row.name = characterization.name; row.photoUrl = photo.photoUrl;
                            row.created_at = new Date(); row.updated_at = new Date();
                        }));
                    }
                }
                await database.batch(...prepared);

                if (data.hierarchiesIds) {
                    const collection = database.get<CharacterizationHierarchyModel>(DBTablesEnum.MM_CHARACTERIZATION_HIERARCHY);
                    const before = await collection.query(Q.where('characterizationId', id)).fetch();
                    for (const relation of before) if (!data.hierarchiesIds.includes(relation.hierarchyId)) await relation.destroyPermanently();
                    const missing = data.hierarchiesIds.filter((hierarchyId) => !before.some((relation) => relation.hierarchyId === hierarchyId));
                    await this.createMMHierarchy(missing, id, Number(characterization.userId));
                }
                return characterization;
            } catch (error) {
                console.error(error);
                throw error;
            }
        });
    }

    /** Compare descendants within the same writer that would hide the entire visit. */
    async hideRemote(id: string, expectedFingerprint: string, updatedAt?: Date) {
        return database.write(async () => {
            const row = await database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION).find(id);
            if (await parentTreeFingerprint(row) !== expectedFingerprint) return false;
            await row.update((parent) => { parent.status = StatusEnum.INACTIVE; parent.updated_at = updatedAt || new Date(); });
            return true;
        });
    }

    async delete(id: string) {
        const { characterization, photos, riskData } = await this.findOne(id);
        const journal = await journalForSource(characterization.workspaceId, Number(characterization.userId));
        const doc = await journal.read();
        const sourceSnapshot = { ...characterization._raw, photos: photos.map((p) => ({ ...p._raw })),
            riskData: riskData.map((r) => ({ ...r._raw })) };
        await database.write(async () => {
            const prepared = await prepareDeletion(journal, { kind: 'CHARACTERIZATION_DELETE', entityId: id,
                payload: { id, sourceSnapshot }, baseSnapshotHash: doc.bases[baseKey('CHARACTERIZATION', id)]?.baseSnapshotHash });
            await database.batch(...prepared, characterization.prepareUpdate((row) => {
                row.status = StatusEnum.INACTIVE; row.updated_at = new Date();
            }));
        });
    }

    async createMMHierarchy(hierarchyIds: string[], characterizationId: string, userId: number) {
        const characterizationHierarchyTable = database.get<CharacterizationHierarchyModel>(
            DBTablesEnum.MM_CHARACTERIZATION_HIERARCHY,
        );

        try {
            await Promise.all(
                hierarchyIds.map(async (hierarchyId) => {
                    await characterizationHierarchyTable.create((newMM) => {
                        newMM.characterizationId = characterizationId;
                        newMM.hierarchyId = hierarchyId;
                        newMM.created_at = new Date();
                        newMM.updated_at = new Date();
                    });
                }),
            );
        } catch (error) {
            console.error(error);
                throw error;
        }
    }

    async deleteMMHierarchy(hierarchyId: string, characterizationId: string) {
        await database.write(async () => {
            const characterizationTable = database.get<CharacterizationHierarchyModel>(
                DBTablesEnum.MM_CHARACTERIZATION_HIERARCHY,
            );
            const [characterization] = await characterizationTable.query(
                Q.where('hierarchyId', hierarchyId),
                Q.where('characterizationId', characterizationId),
            );

            await characterization?.destroyPermanently();
        });
    }

    async createMMEmployee(employeeIds: string[], characterizationId: string, userId: number) {
        const characterizationEmployeeTable = database.get<CharacterizationEmployeeModel>(
            DBTablesEnum.MM_CHARACTERIZATION_EMPLOYEE,
        );

        try {
            await Promise.all(
                employeeIds.map(async (employeeId) => {
                    await characterizationEmployeeTable.create((newMM) => {
                        newMM.characterizationId = characterizationId;
                        newMM.employeeId = employeeId;
                        newMM.created_at = new Date();
                        newMM.updated_at = new Date();
                    });
                }),
            );
        } catch (error) {
            console.error(error);
                throw error;
        }
    }

    async deleteMMEmployee(employeeId: string, characterizationId: string) {
        await database.write(async () => {
            const characterizationEmployeeTable = database.get<CharacterizationEmployeeModel>(
                DBTablesEnum.MM_CHARACTERIZATION_EMPLOYEE,
            );
            const [mmCharacterization] = await characterizationEmployeeTable.query(
                Q.where('employeeId', employeeId),
                Q.where('characterizationId', characterizationId),
            );

            await mmCharacterization?.destroyPermanently();
        });
    }

    async updatePhoto(id: string, data: Partial<ICharacterizationPhoto>, expectedUri?: string) {
        await database.write(async () => {
            const characterizationPhotoTable = database.get<CharacterizationPhotoModel>(
                DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO,
            );

            try {
                const characterizationPhoto = await characterizationPhotoTable.find(id);
                if (expectedUri !== undefined && characterizationPhoto.photoUrl !== expectedUri) return undefined;
                const newRecMed = await characterizationPhoto.update((photo) => {
                    if (data.apiId) photo.apiId = data.apiId;
                    if (data.photoUrl) photo.photoUrl = data.photoUrl;
                    if (data.name) photo.name = data.name;
                    photo.updated_at = new Date();
                });

                return newRecMed;
            } catch (error) {
                console.error(error);
                throw error;
            }
        });
    }

    async relocateFile(id: string, kind: 'audios' | 'videos', oldUri: string, newUri: string, fileId: string) {
        return database.write(async () => {
            const row = await database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION).find(id);
            const files = JSON.parse(row[kind] || '[]') as IFileCharacterization[];
            if (!files.some((file) => file.uri === oldUri)) return false;
            await row.update(() => { row[kind] = JSON.stringify(files.map((file) => file.uri === oldUri ?
                { ...file, uri: newUri, id: file.id || fileId } : file)); });
            return true;
        });
    }

    /** Merge stable server identifiers while retaining every local pending file and local offline URI. */
    async mergeRemoteMedia(id: string, photos: any[] = [], files: any[] = [], journal: SyncJournal) {
        await database.write(async () => {
            const parent = await database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION).find(id);
            const photoTable = database.get<CharacterizationPhotoModel>(DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO);
            const localPhotos = await photoTable.query(Q.where('companyCharacterizationId', id)).fetch();
            const syncTable = database.get<SyncOperationModel>('SyncOperation');
            const records = await syncTable.query(Q.where('context_key', journal.key)).fetch();
            const operations = records.filter((row) => row.recordType === 'OPERATION').map((row) => JSON.parse(row.data));
            const latest = new Map<string, any>(); operations.forEach((entry) => latest.set(entry.operation.entityId, entry));
            const pending = (entityId: string) => latest.has(entityId) && latest.get(entityId).receipt.state !== 'APPLIED';
            const removed = new Set(operations.filter((entry) =>
                ['PHOTO_DELETE', 'FILE_DELETE'].includes(entry.operation.kind)).map((entry) => entry.operation.entityId));
            const prepared: Model[] = [];
            const archive = (entityId: string, snapshot: any) => {
                const key = `MEDIA_ARCHIVE:${entityId}`;
                if (records.some((row) => row.recordType === 'BASE' && row.entityKey === key)) return;
                prepared.push(syncTable.prepareCreate((row) => {
                    row._raw.id = String(uuidGenerator.v4()); row.contextKey = journal.key; row.recordType = 'BASE'; row.entityKey = key;
                    row.data = JSON.stringify({ snapshot });
                }));
            };
            for (const photo of photos) {
                if (!photo.id) continue;
                const local = localPhotos.find((row) => row.id === photo.id || row.apiId === photo.id);
                if (photo.deleted_at) {
                    if (local && !local.deleted_at && local.apiId && !pending(local.id)) {
                        archive(local.id, { ...local._raw, uri: local.photoUrl });
                        prepared.push(local.prepareUpdate((row) => { row.deleted_at = new Date(photo.deleted_at); }));
                    }
                    continue;
                }
                if (removed.has(photo.id)) continue;
                if (local?.deleted_at) continue;
                if (local) {
                    if (local.apiId === photo.id && !/^https?:/.test(local.photoUrl)) continue;
                    prepared.push(local.prepareUpdate((row) => {
                        row.apiId = photo.id;
                        if (/^https?:/.test(row.photoUrl)) row.photoUrl = photo.photoUrl;
                    }));
                } else prepared.push(photoTable.prepareCreate((row) => {
                    row._raw.id = photo.id; row.apiId = photo.id; row.companyCharacterizationId = id;
                    row.name = photo.name || parent.name; row.photoUrl = photo.photoUrl;
                    row.created_at = new Date(photo.created_at || Date.now()); row.updated_at = new Date(photo.updated_at || Date.now());
                }));
            }
            const audios = JSON.parse(parent.audios || '[]') as IFileCharacterization[];
            const videos = JSON.parse(parent.videos || '[]') as IFileCharacterization[];
            const remoteDeleted = new Set<string>();
            for (const file of files) {
                if (!file.id) continue;
                if (file.deleted_at) {
                    const local = [...audios, ...videos].find((f) => f.apiId === file.id);
                    if (local && !pending(local.id || file.id)) { archive(file.id, local); remoteDeleted.add(file.id); }
                    continue;
                }
                if (removed.has(file.id)) continue;
                const extension = /\.([a-zA-Z0-9]+)(?:[?#]|$)/.exec(file.url || '')?.[1]?.toLowerCase();
                const list = ['mp3', 'm4a', 'aac', 'wav', 'caf', 'ogg'].includes(extension || '') ? audios : videos;
                const existing = [...audios, ...videos].find((local) => local.apiId === file.id || local.id === file.id);
                if (existing) {
                    existing.apiId = file.id;
                    if (/^https?:/.test(existing.uri)) existing.uri = file.url;
                } else list.push({ id: file.id, apiId: file.id, uri: file.url });
            }
            const audioString = JSON.stringify(audios.filter((file) => !remoteDeleted.has(file.apiId || '')));
            const videoString = JSON.stringify(videos.filter((file) => !remoteDeleted.has(file.apiId || '')));
            if (parent.audios !== audioString || parent.videos !== videoString) prepared.push(parent.prepareUpdate((row) => {
                row.audios = audioString; row.videos = videoString;
            }));
            if (prepared.length) await database.batch(...prepared);
        });
    }

    async updateFiles(id: string, data: Partial<Pick<ICharacterizationCreate, 'audios' | 'videos'>>) {
        return await database.write(async () => {
            const characterizationTable = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);

            try {
                const characterization = await characterizationTable.find(id);

                const audios = (
                    characterization.audios ? JSON.parse(characterization.audios) : []
                ) as IFileCharacterization[];
                const videos = (
                    characterization.videos ? JSON.parse(characterization.videos) : []
                ) as IFileCharacterization[];

                data.audios?.forEach((audio) => {
                    audios.find((audioItem) => {
                        if (audioItem.uri === audio.uri) {
                            audioItem.apiId = audio.apiId;
                        }
                    });
                });

                data.videos?.forEach((video) => {
                    videos.find((videoItem) => {
                        if (videoItem.uri === video.uri) {
                            videoItem.apiId = video.apiId;
                        }
                    });
                });

                const newCharacterization = await characterization.update(() => {
                    if (data.audios) characterization.audios = JSON.stringify(audios);
                    if (data.videos) characterization.videos = JSON.stringify(videos);

                    characterization.updated_at = new Date();
                });

                return newCharacterization;
            } catch (error) {
                console.error(error);
                throw error;
            }
        });
    }
}
