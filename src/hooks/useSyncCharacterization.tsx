import { AdmsRiskDataModel } from '@libs/watermelon/model/_MMModel/AdmsRiskDataModel';
import { EngsRiskDataModel } from '@libs/watermelon/model/_MMModel/EngsRiskDataModel';
import { EpisRiskDataModel } from '@libs/watermelon/model/_MMModel/EpisRiskDataModel';
import { GenerateRiskDataModel } from '@libs/watermelon/model/_MMModel/GenerateRiskDataModel';
import { RecsRiskDataModel } from '@libs/watermelon/model/_MMModel/RecsRiskDataModel';
import { RiskDataModel } from '@libs/watermelon/model/RiskDataModel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetInfo } from '@react-native-community/netinfo';
import { CharacterizationRepository } from '@repositories/characterizationRepository';
import { IRiskDataCreate, RiskDataRepository } from '@repositories/riskDataRepository';
import { getEquipmentName } from '@screens/Characterization/components/RiskData/RiskDataModalSearch';
import { RiskDataFormSelectedProps } from '@screens/Characterization/types';
import { getSyncCharacterization, ICharacterizationResponseChanges } from '@services/api/sync/getSyncCharacterization';
import { useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { asyncBatch } from '@utils/helpers/asyncBatch';

interface IOptions {
    companyId: string;
    workspaceId: string;
}

interface ISyncOptions {
    workspaceId: string;
    lastSync: Date | null;
    characterizationsServer: ICharacterizationResponseChanges[];
}

export const onGenerateSyncCharacterizatinKey = ({
    companyId,
    workspaceId,
    userId,
}: {
    companyId: string;
    workspaceId: string;
    userId: number;
}) => `${userId}${companyId}${workspaceId}`;

export function useSyncCharacterization() {
    const netInfo = useNetInfo();
    const synchronizing = useRef<Record<string, boolean>>({});
    const { user } = useAuth();

    const onSyncChanges = async ({ characterizationsServer, lastSync, workspaceId }: ISyncOptions) => {
        const characterizationRepository = new CharacterizationRepository();
        const riskDataRepository = new RiskDataRepository();

        const { characterizations: characterizationsLocal } = await characterizationRepository.findAllByWorkspace({
            userId: user.id,
            workspaceId,
        });

        const characterizationMap = onGetCharacterizationMap({
            characterizationsLocal,
            characterizationsServer,
            getLocalId: (l) => l.id,
            getServerId: (s) => s.id,
        });

        const convertArrayServerRiskData = async ({
            serverRiskFactorData,
        }: {
            serverRiskFactorData: ICharacterizationResponseChanges['homogeneousGroup']['riskFactorData'];
        }): Promise<IRiskDataCreate[]> => {
            return Promise.all(
                serverRiskFactorData?.map<Promise<IRiskDataCreate>>((r) => convertServerRiskData({ server: r })),
            );
        };

        const convertServerRiskData = async ({
            server,
            local,
        }: {
            server: ICharacterizationResponseChanges['homogeneousGroup']['riskFactorData'][0];
            local?: RiskDataModel;
        }): Promise<IRiskDataCreate> => {
            const [recsToRiskData, admsToRiskData, engsToRiskData, generateSourcesToRiskData, episToRiskData] =
                await Promise.all([
                    (local?.recsToRiskData as any)?.fetch() as Promise<RecsRiskDataModel[]>,
                    (local?.admsToRiskData as any)?.fetch() as Promise<AdmsRiskDataModel[]>,
                    (local?.engsToRiskData as any)?.fetch() as Promise<EngsRiskDataModel[]>,
                    (local?.generateSourcesToRiskData as any)?.fetch() as Promise<GenerateRiskDataModel[]>,
                    (local?.episToRiskData as any)?.fetch() as Promise<EpisRiskDataModel[]>,
                ]);

            return {
                id: server.id,
                riskId: server.riskId,
                apiId: server.id,
                exposure: server.exposure,
                activities: server.activities?.activities.map((a) => ({
                    description: a.subActivity,
                    name: a.description || '',
                    id: (a.description || '') + a.subActivity,
                })),
                realActivity: server.activities?.realActivity,
                probability: server.probability,
                probabilityAfter: server.probabilityAfter,
                admsToRiskData: server.adms?.map<RiskDataFormSelectedProps>(({ id }) => ({
                    id,
                    name: '',
                    m2mId: admsToRiskData?.find((adm) => adm.recMedId == id)?.id,
                })),
                del_admsToRiskData: admsToRiskData
                    ?.filter((adm) => !server.adms?.some(({ id }) => id == adm.recMedId))
                    .map(({ id }) => id),
                recsToRiskData: server.recs?.map<RiskDataFormSelectedProps>(({ id }) => ({
                    id,
                    name: '',
                    m2mId: recsToRiskData?.find((rec) => rec.recMedId == id)?.id,
                })),
                del_recsToRiskData: recsToRiskData
                    ?.filter((rec) => !server.recs?.some(({ id }) => id == rec.recMedId))
                    .map(({ id }) => id),
                generateSourcesToRiskData: server.generateSources?.map<RiskDataFormSelectedProps>(({ id }) => ({
                    id,
                    name: '',
                    m2mId: generateSourcesToRiskData?.find((gs) => gs.generateSourceId == id)?.id,
                })),
                del_generateSourcesToRiskData: generateSourcesToRiskData
                    ?.filter((gs) => !server.generateSources?.some(({ id }) => id == gs.generateSourceId))
                    .map(({ id }) => id),
                engsToRiskData: server.engsToRiskFactorData?.map<RiskDataFormSelectedProps>(
                    ({ efficientlyCheck, recMedId }) => ({
                        id: recMedId,
                        name: '',
                        efficientlyCheck: efficientlyCheck,
                        m2mId: engsToRiskData?.find((gs) => gs.recMedId == recMedId)?.id,
                    }),
                ),
                del_engsToRiskData: engsToRiskData
                    ?.filter((eng) => !server.engsToRiskFactorData?.some(({ recMedId }) => recMedId == eng.recMedId))
                    .map(({ id }) => id),
                episToRiskData: server.epiToRiskFactorData?.map<RiskDataFormSelectedProps>(
                    ({ epiId, epi, efficientlyCheck }) => ({
                        id: String(epiId),
                        name: getEquipmentName(epi),
                        description: epi.ca,
                        efficientlyCheck: efficientlyCheck,
                        m2mId: episToRiskData?.find((epi) => epi.ca == epi.ca)?.id,
                    }),
                ),
                del_episToRiskData: episToRiskData
                    ?.filter((epiLocal) => !server.epiToRiskFactorData?.some(({ epi }) => epi.ca == epiLocal.ca))
                    .map(({ id }) => id),
            };
        };

        await asyncBatch(Object.entries(characterizationMap), 10, async ([id, { local, server }]) => {
            const shouldDelete = ({
                localCreatedAt,
                existServer,
                localApiId,
            }: {
                localCreatedAt?: Date;
                localApiId?: string;
                existServer: boolean;
            }) => {
                const existInServerOrMissingLocal = existServer || !localCreatedAt;
                if (existInServerOrMissingLocal) return false;

                if (!localApiId) return false;

                return true;
            };

            const shouldCreate = ({ existLocal, existServer }: { existLocal: boolean; existServer: boolean }) => {
                return !!existServer && !existLocal;
            };

            const shouldUpdate = ({ existLocal, existServer }: { existLocal: boolean; existServer: boolean }) => {
                return !!existServer && !!existLocal;
            };

            const toDelete = shouldDelete({
                existServer: !!server,
                localCreatedAt: local?.created_at,
                localApiId: local?.apiId,
            });

            const toCreate = shouldCreate({
                existLocal: !!local,
                existServer: !!server,
            });

            const toUpdate = shouldUpdate({
                existLocal: !!local,
                existServer: !!server,
            });

            if (toDelete) {
                //! Skipp delete to avoid losing data
                // if (local?.id) await characterizationRepository.delete(local.id);
                return;
            }

            if (toCreate) {
                if (server) {
                    await characterizationRepository.create({
                        id: server.id,
                        name: server.name,
                        type: server.type,
                        userId: user.id,
                        workspaceId,
                        apiId: server.id,
                        description: server.description,
                        luminosity: server.luminosity,
                        noiseValue: server.noiseValue,
                        temperature: server.temperature,
                        moisturePercentage: server.moisturePercentage,
                        profileName: server.profileName,
                        profileParentId: server.profileParentId,
                        hierarchiesIds: server.homogeneousGroup.hierarchyOnHomogeneous.map((h) => h.hierarchyId),
                        riskData: await convertArrayServerRiskData({
                            serverRiskFactorData: server.homogeneousGroup.riskFactorData,
                        }),
                    });
                }
                return;
            }

            if (!toUpdate) return;
            if (!local) return;
            if (!server) return;

            const onUpdate = async () => {
                const priorLocal = local.updated_at && new Date(local.updated_at) > new Date(server.updated_at);

                if (!priorLocal) {
                    await characterizationRepository.update(local.id, {
                        name: server.name,
                        type: server.type,
                        description: server.description,
                        luminosity: server.luminosity,
                        noiseValue: server.noiseValue,
                        temperature: server.temperature,
                        moisturePercentage: server.moisturePercentage,
                        profileName: server.profileName,
                        profileParentId: server.profileParentId,
                        hierarchiesIds: server.homogeneousGroup.hierarchyOnHomogeneous.map((h) => h.hierarchyId),
                    });
                }

                const riskDataLocal = await ((local.riskData as any).fetch() as Promise<RiskDataModel[]>);

                const riskDataMap = onGetCharacterizationMap({
                    characterizationsLocal: riskDataLocal || [],
                    characterizationsServer: server.homogeneousGroup.riskFactorData,
                    getLocalId: (l) => l.id,
                    getServerId: (s) => s.id,
                });

                Object.entries(riskDataMap).forEach(async ([id, { local: localRiskData, server: serverRiskData }]) => {
                    const toDelete = shouldDelete({
                        existServer: !!serverRiskData,
                        localCreatedAt: localRiskData?.created_at,
                        localApiId: localRiskData?.apiId,
                    });

                    const toCreate = shouldCreate({
                        existLocal: !!localRiskData,
                        existServer: !!serverRiskData,
                    });

                    const toUpdate = shouldUpdate({
                        existLocal: !!localRiskData,
                        existServer: !!serverRiskData,
                    });

                    if (toDelete) {
                        if (localRiskData?.id) riskDataRepository.delete(localRiskData.id);
                        return;
                    }

                    if (toCreate) {
                        if (serverRiskData) {
                            await riskDataRepository.createRiskDataWithRecMedGs(
                                [await convertServerRiskData({ server: serverRiskData, local: localRiskData })],
                                local.id,
                                user.id,
                            );
                        }
                        return;
                    }

                    if (!toUpdate) return;
                    if (!localRiskData) return;
                    if (!serverRiskData) return;

                    const priorLocal =
                        localRiskData.updated_at &&
                        new Date(localRiskData.updated_at) > new Date(serverRiskData.updatedAt);

                    if (!priorLocal) {
                        await riskDataRepository.update(
                            localRiskData.id,
                            await convertServerRiskData({ server: serverRiskData, local: localRiskData }),
                        );
                    }
                });
            };

            await onUpdate();
        });
    };

    const offlineSynchronize = useCallback(
        async ({ companyId, workspaceId }: IOptions) => {
            try {
                const key = onGenerateSyncCharacterizatinKey({
                    companyId,
                    userId: user.id,
                    workspaceId,
                });

                const storedDate = await AsyncStorage.getItem(key);

                const lastSync = storedDate ? new Date(storedDate) : null;

                const { characterizations } = await getSyncCharacterization({
                    companyId,
                    workspaceId,
                    lastSync: lastSync || undefined,
                });

                await onSyncChanges({ characterizationsServer: characterizations, workspaceId, lastSync });

                AsyncStorage.setItem(key, new Date().toISOString());
            } catch (err) {
                console.error(err);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [user.id],
    );

    const syncCharacterization = useCallback(
        async (options: IOptions) => {
            if (netInfo.isConnected && !synchronizing.current[getSyncCharacterization.name]) {
                synchronizing.current[getSyncCharacterization.name] = true;

                try {
                    await offlineSynchronize(options);
                } catch (error: any) {
                    return {
                        error,
                        errorMessage:
                            'message' in error ? error.message : 'Erro ao syncronizar dados da caracterização',
                    };
                } finally {
                    synchronizing.current[getSyncCharacterization.name] = false;
                }
            }
        },
        [netInfo.isConnected, offlineSynchronize],
    );

    return { syncCharacterization };
}

type StringKeyOf<S> = keyof S extends string ? keyof S : never;

function onGetCharacterizationMap<S, L>({
    characterizationsServer,
    characterizationsLocal,
    getLocalId,
    getServerId,
}: {
    characterizationsServer: S[];
    characterizationsLocal: L[];
    getLocalId: (l: L) => string | undefined;
    getServerId: (l: S) => string;
}) {
    const characterizationMap: Record<string, { server?: S; local?: L }> = {};

    characterizationsServer.forEach((characterizationServer) => {
        const serverIdValue = getServerId(characterizationServer);

        if (!characterizationMap[serverIdValue]) characterizationMap[serverIdValue] = {};

        characterizationMap[serverIdValue] = {
            ...characterizationMap[serverIdValue],
            server: characterizationServer,
        };
    });

    characterizationsLocal.forEach((characterizationLocal) => {
        const localIdValue = getLocalId(characterizationLocal);

        if (!localIdValue) return;
        if (!characterizationMap[localIdValue]) characterizationMap[localIdValue] = {};

        characterizationMap[localIdValue] = {
            ...characterizationMap[localIdValue],
            local: characterizationLocal,
        };
    });

    return characterizationMap;
}
