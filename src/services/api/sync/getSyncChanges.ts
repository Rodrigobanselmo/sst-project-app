import { create } from 'zustand';
import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { api } from '@services/api';
import { IUser } from '@interfaces/IUser';
import { StatusEnum } from '@constants/enums/status.enum';
import { IPagination } from '@interfaces/IPagination';
import queryString from 'query-string';
import { IPaginationReturn } from '@interfaces/IPaginationResponse';
import { ICompany } from '@interfaces/ICompany';
import { emptyMapReturn } from '@utils/helpers/emptyFunc';
import { useAuth } from '@hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { QueryEnum } from '@constants/enums/query.enums';
import { DBTablesEnum } from '@constants/enums/db-tables';

interface IQuerySync {
    lastPulledVersion?: Date;
    companyId?: string;
    companyIds?: string[];
    companyStartIds?: string[];
}

interface IResponseChanges {
    created: any[];
    updated: any[];
    deleted: any[];
}
interface IResponse {
    latestVersion: number;
    changes: {
        [DBTablesEnum.RISK]: IResponseChanges;
        [DBTablesEnum.REC_MED]: IResponseChanges;
        [DBTablesEnum.GENERATE_SOURCE]: IResponseChanges;
        [DBTablesEnum.EMPLOYEE]: IResponseChanges;
        [DBTablesEnum.HIERARCHY]: IResponseChanges;
        [DBTablesEnum.WORKSPACE]: IResponseChanges;
        [DBTablesEnum.COMPANY]: IResponseChanges;
        [DBTablesEnum.MM_WOKSPACE_HIERARCHY]: IResponseChanges;
    };
}

export const getSyncChanges = async (query: IQuerySync) => {
    const queries = queryString.stringify({ ...query });
    const response = await api.get<IResponse>(`${ApiRoutesEnum.SYNC}?${queries}`);

    return response.data;
};
