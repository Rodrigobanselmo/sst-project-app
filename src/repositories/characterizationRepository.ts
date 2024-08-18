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
import { Q } from '@nozbe/watermelondb';
import { CharacterizationEmployeeModel } from '@libs/watermelon/model/_MMModel/CharacterizationEmployeeModel';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';

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
    done_at?: Date;
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
            .query(Q.where('profileParentId', Q.eq(null)), Q.where('workspaceId', workspaceId))
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
        const characterizations = await characterizationCollection.query(Q.where('profileParentId', profileId)).fetch();

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

        return { characterization, photos, riskData, hierarchies, employees };
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
                characterization.created_at = new Date();
                characterization.updated_at = new Date();
                characterization.done_at = data.done_at ? new Date(data.done_at) : undefined;
                characterization.audios = JSON.stringify(data.audios);
                characterization.videos = JSON.stringify(data.videos);
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

    async update(id: string, data: Partial<ICharacterizationCreate>) {
        return await database.write(async () => {
            const characterizationTable = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);
            const characterizationPhotoTable = database.get<CharacterizationPhotoModel>(
                DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO,
            );

            try {
                const characterization = await characterizationTable.find(id);
                const newCharacterization = await characterization.update(() => {
                    console.log(1, data.done_at, data.done_at ? new Date(data.done_at) : null);
                    if (data.apiId) characterization.apiId = data.apiId;
                    if (data.name) characterization.name = data.name;
                    if (data.profileName) characterization.profileName = data.profileName;
                    if (data.description) characterization.description = data.description;
                    if (data.type) characterization.type = data.type;
                    if (data.noiseValue) characterization.noiseValue = data.noiseValue;
                    if (data.temperature) characterization.temperature = data.temperature;
                    if (data.luminosity) characterization.luminosity = data.luminosity;
                    if (data.moisturePercentage) characterization.moisturePercentage = data.moisturePercentage;
                    if (data.audios) characterization.audios = JSON.stringify(data.audios);
                    if (data.videos) characterization.videos = JSON.stringify(data.videos);
                    if (data.done_at !== undefined)
                        characterization.done_at = data.done_at ? new Date(data.done_at) : null;

                    characterization.updated_at = data.updatedAt || new Date();
                });

                const photos = data.photos;

                if (photos) {
                    const beforePhotos: CharacterizationPhotoModel[] | undefined = await (
                        characterization as any
                    )?.photos?.fetch();

                    const imagesToDelete = beforePhotos?.filter(
                        (beforePhoto) => !photos || !photos.find((formPhoto) => formPhoto.id === beforePhoto.id),
                    );

                    const imagesToCreate = photos?.filter((formPhoto) => !formPhoto.id);

                    const imagesToUpdate = photos?.filter(
                        (formPhoto) =>
                            formPhoto.id &&
                            beforePhotos &&
                            !!beforePhotos.find((beforePhoto) => beforePhoto.id === formPhoto.id),
                    );

                    if (imagesToDelete) {
                        await Promise.all(
                            imagesToDelete.map(async (photo) => {
                                if (photo.id) {
                                    const photoToDelete = await characterizationPhotoTable.find(photo.id);
                                    await photoToDelete.destroyPermanently();
                                }
                            }),
                        );
                    }

                    if (imagesToCreate) {
                        await Promise.all(
                            imagesToCreate.map(async (photo) => {
                                await characterizationPhotoTable.create((newPhoto) => {
                                    newPhoto.companyCharacterizationId = newCharacterization.id;
                                    newPhoto.name = newCharacterization.name;
                                    newPhoto.photoUrl = photo.photoUrl;
                                    newPhoto.created_at = new Date();
                                    newPhoto.updated_at = new Date();
                                });
                            }),
                        );
                    }

                    if (imagesToUpdate) {
                        await Promise.all(
                            imagesToUpdate.map(async (photo) => {
                                if (photo.id) {
                                    const photoToUpdate = await characterizationPhotoTable.find(photo.id);

                                    await photoToUpdate.update(() => {
                                        photoToUpdate.name = newCharacterization.name;
                                        photoToUpdate.photoUrl = photo.photoUrl;
                                        photoToUpdate.updated_at = new Date();
                                    });
                                }
                            }),
                        );
                    }
                }

                return characterization;
            } catch (error) {
                console.error(error);
            }
        });
    }

    async delete(id: string) {
        await this.update(id, { name: 'delete', photos: [] });
        await database.write(async () => {
            const characterizationTable = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);
            const characterization = await characterizationTable.find(id);

            await characterization?.destroyPermanently();
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

    async updatePhoto(id: string, data: Partial<ICharacterizationPhoto>) {
        await database.write(async () => {
            const characterizationPhotoTable = database.get<CharacterizationPhotoModel>(
                DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO,
            );

            try {
                const characterizationPhoto = await characterizationPhotoTable.find(id);
                const newRecMed = await characterizationPhoto.update((photo) => {
                    if (data.apiId) photo.apiId = data.apiId;
                    if (data.photoUrl) photo.photoUrl = data.photoUrl;
                    if (data.name) photo.name = data.name;
                    photo.updated_at = new Date();
                });

                return newRecMed;
            } catch (error) {
                console.error(error);
            }
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
                    if (data.audios) characterization.audios = JSON.stringify(data.audios);
                    if (data.videos) characterization.videos = JSON.stringify(data.videos);

                    characterization.updated_at = new Date();
                });

                return newCharacterization;
            } catch (error) {
                console.error(error);
            }
        });
    }
}
