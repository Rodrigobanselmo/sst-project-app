import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { ExposureTypeEnum } from '@constants/enums/exposure.enum';
import { StatusEnum } from '@constants/enums/status.enum';
import { api } from '@services/api';
import queryString from 'query-string';
import { storageUserGet } from '@libs/storage/disk/user';
import { storageAuthTokenGet } from '@libs/storage/disk/token';

interface IQuerySync {
    companyId: string;
    lastSync?: Date;
    workspaceId: string;
}

export interface ICharacterizationResponseChanges {
    mobileSync?: { baseSnapshotHash: string; snapshot: Record<string, any> };
    photos?: { id: string; name?: string; photoUrl: string; created_at?: string; updated_at?: string; deleted_at?: string | null }[];
    files?: { id: string; url: string; deleted_at?: string | null }[];
    id: string;
    name: string;
    description: string;
    created_at: Date;
    deleted_at: Date;
    updated_at: Date;
    done_at: Date;
    type: CharacterizationTypeEnum;
    luminosity: string;
    moisturePercentage: string;
    noiseValue: string;
    temperature: string;
    profileName: string;
    profileParentId: string;
    status: StatusEnum;
    homogeneousGroup: {
        hierarchyOnHomogeneous: {
            id?: number;
            hierarchyId: string;
            homogeneousGroupId?: string;
            startDate?: Date | string | null;
            endDate?: Date | string | null;
            deletedAt?: Date | string | null;
        }[];
        riskFactorData: {
            mobileSync?: { baseSnapshotHash: string; snapshot: Record<string, any> };
            createdAt: Date;
            updatedAt: Date;
            activities?: {
                activities: { description?: string; subActivity?: string }[];
                realActivity?: string;
            } | { description?: string; subActivity?: string }[];
            probability?: number;
            probabilityAfter?: number;
            exposure?: ExposureTypeEnum;
            riskId: string;
            id: string;
            adms?: {
                id: string;
            }[];
            recs?: {
                id: string;
            }[];
            generateSources?: {
                id: string;
            }[];
            epiToRiskFactorData?: {
                epiId: number;
                riskFactorDataId: string;
                efficientlyCheck: boolean;
                epcCheck: boolean;
                lifeTimeInDays: number | null;
                longPeriodsCheck: boolean;
                maintenanceCheck: boolean;
                sanitationCheck: boolean;
                tradeSignCheck: boolean;
                trainingCheck: boolean;
                unstoppedCheck: boolean;
                validationCheck: boolean;
                endDate: Date | null;
                startDate: Date | null;
                epi: {
                    ca: string;
                    equipment: string;
                };
            }[];
            engsToRiskFactorData?: {
                recMedId: string;
                efficientlyCheck: boolean;
            }[];
        }[];
    };
}

interface IResponse {
    characterizations: ICharacterizationResponseChanges[];
    latestVersion?: string | number;
    fullSnapshot?: boolean;
}

export const getSyncCharacterization = async (query: IQuerySync, expectedActorId?: number, signal?: AbortSignal) => {
    const assertActor = async () => {
        if (expectedActorId !== undefined && Number((await storageUserGet())?.id) !== expectedActorId) throw Object.assign(
            new Error('A sessão mudou. Entre com o usuário desta coleta para continuar.'), { code: 'AUTH_SESSION_CHANGED', status: 401 });
    };
    await assertActor();
    const token = expectedActorId !== undefined ? await storageAuthTokenGet() : undefined;
    await assertActor();
    const queries = queryString.stringify({ ...query, lastSync: query.lastSync?.toISOString() });
    const response = await api.get<IResponse>(`${ApiRoutesEnum.SYNC}/characterization?${queries}`, {
        timeout: 30000, signal, ...(token?.token ? { headers: { Authorization: `Bearer ${token.token}` } } : {}) });
    await assertActor();

    return response.data;
};
