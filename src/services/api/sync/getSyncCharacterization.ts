import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { ExposureTypeEnum } from '@constants/enums/exposure.enum';
import { StatusEnum } from '@constants/enums/status.enum';
import { api } from '@services/api';
import queryString from 'query-string';

interface IQuerySync {
    companyId: string;
    lastSync?: Date;
    workspaceId: string;
}

export interface ICharacterizationResponseChanges {
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
            hierarchyId: string;
        }[];
        riskFactorData: {
            createdAt: Date;
            updatedAt: Date;
            activities?: {
                activities: { description?: string; subActivity?: string }[];
                realActivity?: string;
            };
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
}

export const getSyncCharacterization = async (query: IQuerySync) => {
    const queries = queryString.stringify({ ...query });
    const response = await api.get<IResponse>(`${ApiRoutesEnum.SYNC}/characterization?${queries}`);

    return response.data;
};
