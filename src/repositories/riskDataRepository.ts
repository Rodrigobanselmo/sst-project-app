import { DBTablesEnum } from '@constants/enums/db-tables';
import { MeasuresTypeEnum, RecTypeEnum } from '@constants/enums/risk.enum';
import { StatusEnum } from '@constants/enums/status.enum';
import { database } from '@libs/watermelon';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import { GenerateSourceModel } from '@libs/watermelon/model/GenerateSourceModel';
import { RecMedModel } from '@libs/watermelon/model/RecMedModel';
import { IRiskDataActivities, RiskDataModel } from '@libs/watermelon/model/RiskDataModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { AdmsRiskDataModel } from '@libs/watermelon/model/_MMModel/AdmsRiskDataModel';
import { EngsRiskDataModel } from '@libs/watermelon/model/_MMModel/EngsRiskDataModel';
import { EpisRiskDataModel } from '@libs/watermelon/model/_MMModel/EpisRiskDataModel';
import { GenerateRiskDataModel } from '@libs/watermelon/model/_MMModel/GenerateRiskDataModel';
import { RecsRiskDataModel } from '@libs/watermelon/model/_MMModel/RecsRiskDataModel';
import clone from 'clone';
import { Q } from '@nozbe/watermelondb';
import {
    RiskDataFormActivitySelectedProps,
    RiskDataFormRelationsDeletionsProps,
    RiskDataFormRelationsProps,
    RiskDataFormSelectedProps,
} from '@screens/Characterization/types';
import uuidGenerator from 'react-native-uuid';

export interface IRiskDataCreate extends RiskDataFormRelationsDeletionsProps, RiskDataFormRelationsProps {
    id?: string;
    realActivity?: string;
    exposure?: string;
    probability?: number;
    probabilityAfter?: number;
    riskId: string;
}

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

const formatActivities = (data: Pick<IRiskDataCreate, 'activities' | 'realActivity'>) => {
    const activities = data.activities?.map<RiskDataFormActivitySelectedProps>((activity) => {
        return {
            description: activity.name,
            subActivity: activity.description,
        };
    });

    return JSON.stringify({
        activities: activities || [],
        realActivity: data.realActivity,
    } satisfies IRiskDataActivities);
};

export class RiskDataRepository {
    constructor() {}

    async findOne(id: string) {
        const riskDataCollection = database.get<RiskDataModel>(DBTablesEnum.RISK_DATA);

        const riskData = await riskDataCollection.find(id);

        return { riskData };
    }

    async findByRiskIdAndCharacterizationId(riskId: string, characterizationId: string) {
        const riskDataCollection = database.get<RiskDataModel>(DBTablesEnum.RISK_DATA);

        const [riskData] = await riskDataCollection
            .query(Q.where('riskId', riskId), Q.where('characterizationId', characterizationId), Q.take(1))
            .fetch();

        return { riskData };
    }

    async createRiskData(riskData: IRiskDataCreate[], characterizationId: string, userId: number) {
        const riskDataTable = database.get<RiskDataModel>(DBTablesEnum.RISK_DATA);
        try {
            await Promise.all(
                riskData.map(async (_riskData) => {
                    const newRiskData = await riskDataTable.create((newRiskData) => {
                        if (_riskData.id) newRiskData._raw.id = _riskData.id;
                        newRiskData.characterizationId = characterizationId;
                        newRiskData.riskId = _riskData.riskId;
                        newRiskData.probability = _riskData.probability;
                        newRiskData.exposure = _riskData.exposure;
                        newRiskData.probabilityAfter = _riskData.probabilityAfter;
                        newRiskData.userId = String(userId);
                        newRiskData.created_at = new Date();
                        newRiskData.updated_at = new Date();

                        const activitiesString = formatActivities(_riskData);
                        if (activitiesString) {
                            newRiskData.activities = activitiesString;
                        }
                    });

                    await this.createRiskDataRelations(_riskData, newRiskData.id, userId);
                }),
            );
        } catch (error) {
            console.error(error);
        }
    }

    async createRiskDataWithRecMedGs(riskData: IRiskDataCreate[], characterizationId: string, userId: number) {
        await database.write(async () => {
            const newRiskData = await this.createRecMedGS(riskData, userId);
            await this.createRiskData(newRiskData, characterizationId, userId);
        });
    }

    async createRiskDataRelations<T>(
        riskData: T extends IRiskDataCreate ? IRiskDataCreate : Partial<IRiskDataCreate> & { riskId: string },
        riskDataId: string,
        userId: number,
    ) {
        const MMGSTable = database.get<GenerateRiskDataModel>(DBTablesEnum.MM_GENERATE_TO_RISK_DATA);
        const MMEpisTable = database.get<EpisRiskDataModel>(DBTablesEnum.MM_EPIS_TO_RISK_DATA);
        const MMAdmsTable = database.get<AdmsRiskDataModel>(DBTablesEnum.MM_ADMS_TO_RISK_DATA);
        const MMEngsTable = database.get<EngsRiskDataModel>(DBTablesEnum.MM_ENGS_TO_RISK_DATA);
        const MMRecTable = database.get<RecsRiskDataModel>(DBTablesEnum.MM_RECS_TO_RISK_DATA);
        try {
            const promisses = [];

            if (riskData.generateSourcesToRiskData) {
                const gsPromisses = Promise.all(
                    riskData.generateSourcesToRiskData.map(async (gs) => {
                        if (gs.id) {
                            if (!gs.m2mId) {
                                await MMGSTable.create((newGs) => {
                                    newGs.generateSourceId = gs.id as string;
                                    newGs.riskDataId = riskDataId;
                                    newGs.userId = String(userId);
                                    newGs.created_at = new Date();
                                    newGs.updated_at = new Date();
                                });
                            }
                        }
                    }),
                );

                promisses.push(gsPromisses);
            }

            if (riskData.episToRiskData) {
                const episPromisses = Promise.all(
                    riskData.episToRiskData.map(async (epi) => {
                        if (epi.id !== undefined) {
                            if (!epi.m2mId) {
                                await MMEpisTable.create((newEpi) => {
                                    newEpi.ca = epi.id as string;
                                    newEpi.riskDataId = riskDataId;
                                    newEpi.efficientlyCheck = epi.efficientlyCheck;
                                    newEpi.userId = String(userId);
                                    newEpi.created_at = new Date();
                                    newEpi.updated_at = new Date();
                                });
                            } else {
                                const epiMM = await MMEpisTable.find(epi.m2mId);
                                await epiMM.update(() => {
                                    epiMM.efficientlyCheck = epi.efficientlyCheck;
                                    epiMM.updated_at = new Date();
                                });
                            }
                        }
                    }),
                );

                promisses.push(episPromisses);
            }

            if (riskData.admsToRiskData) {
                const admsPromisses = Promise.all(
                    riskData.admsToRiskData.map(async (adm) => {
                        if (adm.id) {
                            if (!adm.m2mId) {
                                await MMAdmsTable.create((newAdm) => {
                                    newAdm.recMedId = adm.id as string;
                                    newAdm.riskDataId = riskDataId;
                                    newAdm.userId = String(userId);
                                    newAdm.created_at = new Date();
                                    newAdm.updated_at = new Date();
                                });
                            }
                        }
                    }),
                );

                promisses.push(admsPromisses);
            }

            if (riskData.engsToRiskData) {
                const engsPromisses = Promise.all(
                    riskData.engsToRiskData.map(async (eng) => {
                        if (eng.id) {
                            if (!eng.m2mId) {
                                await MMEngsTable.create((newEng) => {
                                    newEng.recMedId = eng.id as string;
                                    newEng.riskDataId = riskDataId;
                                    newEng.efficientlyCheck = eng.efficientlyCheck;
                                    newEng.userId = String(userId);
                                    newEng.created_at = new Date();
                                    newEng.updated_at = new Date();
                                });
                            } else {
                                const engMM = await MMEngsTable.find(eng.m2mId);
                                await engMM.update(() => {
                                    engMM.efficientlyCheck = eng.efficientlyCheck;
                                    engMM.updated_at = new Date();
                                });
                            }
                        }
                    }),
                );

                promisses.push(engsPromisses);
            }

            if (riskData.recsToRiskData) {
                const recsPromisses = Promise.all(
                    riskData.recsToRiskData.map(async (rec) => {
                        if (rec.id) {
                            if (!rec.m2mId) {
                                await MMRecTable.create((newRec) => {
                                    newRec.recMedId = rec.id as string;
                                    newRec.riskDataId = riskDataId;
                                    newRec.userId = String(userId);
                                    newRec.created_at = new Date();
                                    newRec.updated_at = new Date();
                                });
                            }
                        }
                    }),
                );

                promisses.push(recsPromisses);
            }

            if (riskData.del_generateSourcesToRiskData) {
                const gsPromisses = Promise.all(
                    riskData.del_generateSourcesToRiskData.map(async (gs) => {
                        const gsMM = await MMGSTable.find(gs);
                        await gsMM.destroyPermanently();
                    }),
                );

                promisses.push(gsPromisses);
            }

            if (riskData.del_episToRiskData) {
                const episPromisses = Promise.all(
                    riskData.del_episToRiskData.map(async (epi) => {
                        const epiMM = await MMEpisTable.find(epi);
                        await epiMM.destroyPermanently();
                    }),
                );

                promisses.push(episPromisses);
            }

            if (riskData.del_admsToRiskData) {
                const admsPromisses = Promise.all(
                    riskData.del_admsToRiskData.map(async (adm) => {
                        const admMM = await MMAdmsTable.find(adm);
                        await admMM.destroyPermanently();
                    }),
                );

                promisses.push(admsPromisses);
            }

            if (riskData.del_engsToRiskData) {
                const engsPromisses = Promise.all(
                    riskData.del_engsToRiskData.map(async (eng) => {
                        const engMM = await MMEngsTable.find(eng);
                        await engMM.destroyPermanently();
                    }),
                );

                promisses.push(engsPromisses);
            }

            if (riskData.del_recsToRiskData) {
                const recsPromisses = Promise.all(
                    riskData.del_recsToRiskData.map(async (rec) => {
                        const recMM = await MMRecTable.find(rec);
                        await recMM.destroyPermanently();
                    }),
                );

                promisses.push(recsPromisses);
            }

            await Promise.all(promisses);
        } catch (error) {
            console.error(error);
        }
    }

    async createRecMedGS<T>(
        _riskData: (T extends IRiskDataCreate ? IRiskDataCreate : Partial<IRiskDataCreate> & { riskId: string })[],
        userId: number,
    ) {
        const generateSourceTable = database.get<GenerateSourceModel>(DBTablesEnum.GENERATE_SOURCE);
        const recMedTable = database.get<RecMedModel>(DBTablesEnum.REC_MED);

        const generateSourceMap: Record<string, IGenerateSourceCreate> = {};
        const recMedMap: Record<string, IRecMedCreate> = {};
        const riskData = clone(_riskData) as IRiskDataCreate[];

        riskData?.forEach((_riskData, _index) => {
            _riskData?.generateSourcesToRiskData?.forEach((gs, index) => {
                if (!gs?.id) {
                    const uuid = uuidGenerator.v4() as string;
                    generateSourceMap[gs.name] = {
                        id: uuid,
                        name: gs.name,
                        riskId: _riskData.riskId,
                    };

                    (riskData as any)[_index].generateSourcesToRiskData[index].id = uuid;
                }
            });

            _riskData?.engsToRiskData?.forEach((eng, index) => {
                if (!eng?.id) {
                    const uuid = uuidGenerator.v4() as string;
                    recMedMap[eng.name] = {
                        id: uuid,
                        medName: eng.name,
                        medType: MeasuresTypeEnum.ENG,
                        riskId: _riskData.riskId,
                    };
                    (_riskData as any).engsToRiskData[index].id = uuid;
                }
            });

            _riskData?.admsToRiskData?.forEach((adm, index) => {
                if (!adm?.id) {
                    const uuid = uuidGenerator.v4() as string;
                    recMedMap[adm.name] = {
                        id: uuid,
                        medName: adm.name,
                        medType: MeasuresTypeEnum.ADM,
                        riskId: _riskData.riskId,
                    };
                    (_riskData as any).admsToRiskData[index].id = uuid;
                }
            });

            _riskData?.recsToRiskData?.forEach((rec, index) => {
                if (!rec?.id) {
                    const uuid = uuidGenerator.v4() as string;
                    recMedMap[rec.name] = {
                        id: uuid,
                        recName: rec.name,
                        recType: rec.type,
                        riskId: _riskData.riskId,
                    };
                    (_riskData as any).recsToRiskData[index].id = uuid;
                }
            });
        });

        try {
            if (riskData) {
                const gsPromisses = Object.values(generateSourceMap).map(async (gs) => {
                    return generateSourceTable.create((newGs) => {
                        newGs._raw.id = gs.id;
                        newGs.riskId = gs.riskId;
                        newGs.name = gs.name;
                        newGs.userId = String(userId);
                        newGs.created_at = new Date();
                        newGs.updated_at = new Date();
                        newGs.status = StatusEnum.ACTIVE;
                    });
                });

                const recMedPromisses = Object.values(recMedMap).map(async (recMed) => {
                    return recMedTable.create((newRecMed) => {
                        newRecMed._raw.id = recMed.id;
                        newRecMed.riskId = recMed.riskId;
                        newRecMed.recName = recMed.recName;
                        newRecMed.medName = recMed.medName;
                        newRecMed.recType = recMed.recType;
                        newRecMed.medType = recMed.medType;
                        newRecMed.userId = String(userId);
                        newRecMed.created_at = new Date();
                        newRecMed.updated_at = new Date();
                        newRecMed.status = StatusEnum.ACTIVE;
                    });
                });

                await Promise.all([...gsPromisses, ...recMedPromisses]);
            }
        } catch (error) {
            console.error(error);
        }

        return riskData;
    }

    async update(id: string, data: Partial<IRiskDataCreate> & { riskId: string }) {
        await database.write(async () => {
            const riskDataCollection = database.get<RiskDataModel>(DBTablesEnum.RISK_DATA);

            try {
                const riskData = await riskDataCollection.find(id);
                const newRiskData = await riskData.update(() => {
                    if (data.exposure) riskData.exposure = data.exposure;
                    if (data.probability) riskData.probability = data.probability;
                    if (data.probabilityAfter) riskData.probabilityAfter = data.probabilityAfter;

                    const activitiesString = formatActivities(data);
                    if (activitiesString) {
                        riskData.activities = activitiesString;
                    }

                    riskData.updated_at = new Date();
                });

                let rikDataArray = [data];
                rikDataArray = await this.createRecMedGS(rikDataArray, Number(riskData.userId));

                await this.createRiskDataRelations(rikDataArray[0], riskData.id, Number(riskData.userId));

                return newRiskData;
            } catch (error) {
                console.error(error);
            }
        });
    }

    async getRiskDataInfo(riskData: RiskDataModel) {
        const [recsToRiskData, admsToRiskData, engsToRiskData, generateSourcesToRiskData, episToRiskData] =
            await Promise.all([
                (riskData?.recsToRiskData as any)?.fetch() as Promise<RecsRiskDataModel[]>,
                (riskData?.admsToRiskData as any)?.fetch() as Promise<AdmsRiskDataModel[]>,
                (riskData?.engsToRiskData as any)?.fetch() as Promise<EngsRiskDataModel[]>,
                (riskData?.generateSourcesToRiskData as any)?.fetch() as Promise<GenerateRiskDataModel[]>,
                (riskData?.episToRiskData as any)?.fetch() as Promise<EpisRiskDataModel[]>,
            ]);

        const recsToRiskDataWithRecsPromise = Promise.all(
            recsToRiskData.map(async (recsMM) => {
                const recMed = await ((recsMM.RecMed as any).fetch() as Promise<RecMedModel>);
                return {
                    name: recMed.recName,
                    apiId: recMed.apiId,
                    riskId: recMed.riskId,
                    id: recMed.id,
                    m2mId: recsMM.id,
                };
            }),
        );

        const admsToRiskDataWithRecsPromise = Promise.all(
            admsToRiskData.map(async (admsMM) => {
                const adm = await ((admsMM.RecMed as any).fetch() as Promise<RecMedModel>);
                return {
                    name: adm.medName,
                    id: adm.id,
                    apiId: adm.apiId,
                    riskId: adm.riskId,
                    m2mId: admsMM.id,
                };
            }),
        );

        const engsToRiskDataWithRecsPromise = Promise.all(
            engsToRiskData.map(async (engsMM) => {
                const eng = await ((engsMM.RecMed as any).fetch() as Promise<RecMedModel>);
                return {
                    name: eng.medName,
                    apiId: eng.apiId,
                    riskId: eng.riskId,
                    id: eng.id,
                    efficientlyCheck: engsMM.efficientlyCheck,
                    m2mId: engsMM.id,
                };
            }),
        );

        const gsToRiskDataWithGSPromise = Promise.all(
            generateSourcesToRiskData.map(async (gsMM) => {
                const gs = await ((gsMM.GenerateSource as any).fetch() as Promise<GenerateSourceModel>);
                return {
                    name: gs.name,
                    riskId: gs.riskId,
                    apiId: gs.apiId,
                    id: gs.id,
                    m2mId: gsMM.id,
                };
            }),
        );

        const [recsToRiskDataWithRecs, admsToRiskDataWithRecs, engsToRiskDataWithRecs, gsToRiskDataWithGS] =
            await Promise.all([
                recsToRiskDataWithRecsPromise,
                admsToRiskDataWithRecsPromise,
                engsToRiskDataWithRecsPromise,
                gsToRiskDataWithGSPromise,
            ]);

        return {
            recsToRiskData: recsToRiskDataWithRecs,
            admsToRiskData: admsToRiskDataWithRecs,
            engsToRiskData: engsToRiskDataWithRecs,
            generateSourcesToRiskData: gsToRiskDataWithGS,
            episToRiskData: episToRiskData.map((episMM) => ({
                name: episMM.ca,
                id: episMM.ca,
                m2mId: episMM.id,
                efficientlyCheck: episMM.efficientlyCheck,
            })),
        };
    }

    async delete(id: string) {
        await database.write(async () => {
            const riskDataTable = database.get<RiskDataModel>(DBTablesEnum.RISK_DATA);
            const riskData = await riskDataTable.find(id);

            await riskData?.destroyPermanently();
        });
    }
}
