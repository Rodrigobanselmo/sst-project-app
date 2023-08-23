// import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
// import { DBTablesEnum } from '@constants/enums/db-tables';
// import { MeasuresTypeEnum, RecTypeEnum } from '@constants/enums/risk.enum';
// import { StatusEnum } from '@constants/enums/status.enum';
// import { database } from '@libs/watermelon';
// import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
// import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
// import { RiskModel } from '@libs/watermelon/model/RiskModel';
// import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';

// export interface IRiskCreate {
//     apiId?: string;
//     name: string;
//     severity: number;
//     companyId?: string;
//     representAll?: boolean;
//     isAll?: boolean;
//     userId: number;
//     recMed?: {
//         id?: string;
//         apiId?: string;
//         recName?: string;
//         medName?: string;
//         medType?: MeasuresTypeEnum;
//         recType?: RecTypeEnum;
//     }[];
//     generateSource?: {
//         id?: string;
//         apiId?: string;
//         name: string;
//     }[];
// }

// export class CharacterizationRepository {
//     constructor() {}

//     async findMany({ userId }: { userId: number }) {
//         const userTable = database.get<RiskModel>(DBTablesEnum.RISK);
//         const user = await userTable.find(String(userId));

//         const characterizations: CharacterizationModel[] = await (user?.characterizations as any)?.fetch();

//         return { characterizations };
//     }

//     async findOne(id: string) {
//         const characterizationCollection = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);

//         const characterization = await characterizationCollection.find(id);
//         const photos = await (characterization?.photos as any)?.fetch();

//         return { characterization, photos };
//     }

//     async create(data: IRiskCreate) {
//         await database.write(async () => {
//             const characterizationTable = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);
//             const characterizationPhotoTable = database.get<CharacterizationPhotoModel>(
//                 DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO,
//             );

//             const newCharacterization = await characterizationTable.create((characterization) => {
//                 characterization.apiId = data.apiId;
//                 characterization.name = data.name;
//                 characterization.userId = String(data.userId);
//                 characterization.description = data.description;
//                 characterization.type = data.type;
//                 characterization.noiseValue = data.noiseValue;
//                 characterization.temperature = data.temperature;
//                 characterization.luminosity = data.luminosity;
//                 characterization.moisturePercentage = data.moisturePercentage;
//                 characterization.workspaceId = data.workspaceId;
//                 characterization.status = StatusEnum.ACTIVE;
//                 characterization.created_at = new Date();
//                 characterization.updated_at = new Date();
//             });

//             try {
//                 if (data.photos)
//                     await Promise.all(
//                         data.photos.map(async (photo) => {
//                             await characterizationPhotoTable.create((newPhoto) => {
//                                 newPhoto.apiId = photo.apiId;
//                                 newPhoto.companyCharacterizationId = newCharacterization.id;
//                                 newPhoto.name = data.name;
//                                 newPhoto.photoUrl = photo.photoUrl;
//                                 newPhoto.created_at = new Date();
//                                 newPhoto.updated_at = new Date();
//                             });
//                         }),
//                     );

//                 return newCharacterization;
//             } catch (error) {
//                 console.error(error);
//             }
//         });
//     }

//     async update(id: string, data: Partial<IRiskCreate> & { name: string }) {
//         await database.write(async () => {
//             const characterizationTable = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);
//             const characterizationPhotoTable = database.get<CharacterizationPhotoModel>(
//                 DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO,
//             );

//             try {
//                 const characterization = await characterizationTable.find(id);
//                 const newCharacterization = await characterization.update(() => {
//                     if (data.apiId) characterization.apiId = data.apiId;
//                     if (data.name) characterization.name = data.name;
//                     if (data.description) characterization.description = data.description;
//                     if (data.type) characterization.type = data.type;
//                     if (data.noiseValue) characterization.noiseValue = data.noiseValue;
//                     if (data.temperature) characterization.temperature = data.temperature;
//                     if (data.luminosity) characterization.luminosity = data.luminosity;
//                     if (data.moisturePercentage) characterization.moisturePercentage = data.moisturePercentage;

//                     characterization.updated_at = new Date();
//                 });

//                 const photos = data.photos;

//                 if (photos) {
//                     const beforePhotos: CharacterizationPhotoModel[] | undefined = await (
//                         characterization as any
//                     )?.photos?.fetch();

//                     const imagesToDelete = beforePhotos?.filter(
//                         (beforePhoto) => !photos || !photos.find((formPhoto) => formPhoto.id === beforePhoto.id),
//                     );

//                     const imagesToCreate = photos?.filter((formPhoto) => !formPhoto.id);

//                     const imagesToUpdate = photos?.filter(
//                         (formPhoto) =>
//                             formPhoto.id &&
//                             beforePhotos &&
//                             !!beforePhotos.find((beforePhoto) => beforePhoto.id === formPhoto.id),
//                     );

//                     if (imagesToDelete) {
//                         await Promise.all(
//                             imagesToDelete.map(async (photo) => {
//                                 if (photo.id) {
//                                     const photoToDelete = await characterizationPhotoTable.find(photo.id);
//                                     await photoToDelete.destroyPermanently();
//                                 }
//                             }),
//                         );
//                     }

//                     if (imagesToCreate) {
//                         await Promise.all(
//                             imagesToCreate.map(async (photo) => {
//                                 await characterizationPhotoTable.create((newPhoto) => {
//                                     newPhoto.companyCharacterizationId = newCharacterization.id;
//                                     newPhoto.name = data.name;
//                                     newPhoto.photoUrl = photo.photoUrl;
//                                     newPhoto.created_at = new Date();
//                                     newPhoto.updated_at = new Date();
//                                 });
//                             }),
//                         );
//                     }

//                     if (imagesToUpdate) {
//                         await Promise.all(
//                             imagesToUpdate.map(async (photo) => {
//                                 if (photo.id) {
//                                     const photoToUpdate = await characterizationPhotoTable.find(photo.id);

//                                     await photoToUpdate.update(() => {
//                                         photoToUpdate.name = data.name;
//                                         photoToUpdate.photoUrl = photo.photoUrl;
//                                         photoToUpdate.updated_at = new Date();
//                                     });
//                                 }
//                             }),
//                         );
//                     }
//                 }
//             } catch (error) {
//                 console.error(error);
//             }
//         });
//     }

//     async delete(id: string) {
//         await this.update(id, { name: 'delete', photos: [] });
//         await database.write(async () => {
//             const characterizationTable = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);
//             const characterization = await characterizationTable.find(id);

//             await characterization?.destroyPermanently();
//         });
//     }
// }
