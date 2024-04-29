import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { ExposureTypeEnum } from '@constants/enums/exposure.enum';
import { HomoTypeEnum } from '@constants/enums/homo-type.enum';
import { QueryEnum } from '@constants/enums/query.enums';
import { IErrorResp } from '@interfaces/IApi';
import { IEpiRiskData } from '@interfaces/IEpi';
import { IEngsRiskData } from '@interfaces/IRecMed';
import { IRiskData } from '@interfaces/IRiskData';
import { api } from '@services/api';
import { queryClient } from '@services/queryClient';
import { useMutation } from '@tanstack/react-query';

export interface IUpsertRiskData {
    id?: string;
    companyId: string;
    riskId?: string;
    riskIds?: string[];
    hierarchyId?: string;
    homogeneousGroupId?: string;
    standardExams?: boolean;
    probability?: number;
    probabilityAfter?: number;
    exposure?: ExposureTypeEnum;
    activities?: any;
    adms?: string[];
    recs?: string[];
    type?: HomoTypeEnum;
    generateSources?: string[];
    workspaceId?: string;
    epis?: IEpiRiskData[];
    engs?: IEngsRiskData[];
    keepEmpty?: boolean;
    json?: any;
    startDate?: Date;
    endDate?: Date;
}

export async function upsertRiskData(data: IUpsertRiskData) {
    if (!data.companyId) return null;

    data.keepEmpty = true;
    const response = await api.post<IRiskData>(`${ApiRoutesEnum.RISK_DATA}`, data);

    if (typeof response.data === 'string') {
        return {
            riskId: data.riskId,
            homogeneousGroupId: data.homogeneousGroupId,
            deletedId: response.data,
        } as unknown as IRiskData;
    }
    return response.data;
}

export function useMutUpsertRiskData() {
    return useMutation({
        mutationFn: async (data: IUpsertRiskData) => upsertRiskData(data),
        onSuccess: async (resp) => {
            queryClient.invalidateQueries({ queryKey: [QueryEnum.ENVIRONMENT] });
            queryClient.invalidateQueries({ queryKey: [QueryEnum.EXAMS_RISK_DATA] });
            queryClient.invalidateQueries({ queryKey: [QueryEnum.CHARACTERIZATION] });
            queryClient.invalidateQueries({ queryKey: [QueryEnum.RISK_DATA] });
            queryClient.invalidateQueries({ queryKey: [QueryEnum.RISK_DATA] });

            return resp;
        },
    });
}
