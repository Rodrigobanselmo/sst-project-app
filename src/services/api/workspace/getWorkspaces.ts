import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { api } from '@services/api';
import { IUser } from '@interfaces/IUser';
import { StatusEnum } from '@constants/enums/status.enum';
import { IPagination } from '@interfaces/IPagination';
import queryString from 'query-string';
import { IPaginationReturn } from '@interfaces/IPaginationResponse';
import { emptyMapReturn } from '@utils/helpers/emptyFunc';
import { useAuth } from '@hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { QueryEnum } from '@constants/enums/query.enums';
import { IWorkspace } from '@interfaces/ICompany';

export interface IQueryWorkspaces {
    search?: string;
    companyId?: string;
    clinicExamsIds?: number[];
    clinicsCompanyId?: string;
    companyToClinicsId?: string;
    userId?: number;
    groupId?: number;
    isClinic?: boolean;
    isGroup?: boolean;
    findAll?: boolean;
    isCompany?: boolean;
    isPeriodic?: boolean;
    selectReport?: boolean;
    isChange?: boolean;
    isAdmission?: boolean;
    isReturn?: boolean;
    isDismissal?: boolean;
    scheduleBlockId?: number;

    companiesIds?: string[];
    companiesGroupIds?: string[];
    cities?: string[];
    uf?: string[];

    disabled?: boolean;
}

export const getWorkspaces = async ({ skip, take }: IPagination, query: IQueryWorkspaces) => {
    if ('userId' in query && query.userId === 0) return <Promise<IPaginationReturn<IWorkspace>>>emptyMapReturn();
    if ('groupId' in query && query.userId === 0) return <Promise<IPaginationReturn<IWorkspace>>>emptyMapReturn();

    const queries = queryString.stringify({ ...query, app: true });
    const response = await api.get<IPaginationReturn<IWorkspace>>(
        `${ApiRoutesEnum.WORKSPACE}?take=${take}&skip=${skip}&${queries}`,
    );

    return response.data;
};

export function useQueryWorkspaces(page = 1, query = {} as IQueryWorkspaces, take = 8) {
    const { user } = useAuth();
    const companyId = query.companyId || user?.companyId;

    const pagination: IPagination = {
        skip: (page - 1) * (take || 20),
        take: take || 20,
    };

    const { data, ...rest } = useQuery({
        queryKey: [QueryEnum.WORKSPACE, companyId, page, { ...pagination, ...query }],
        queryFn: () =>
            companyId && !query.disabled
                ? getWorkspaces(pagination, { ...query, companyId })
                : <Promise<IPaginationReturn<IWorkspace>>>emptyMapReturn(),
        staleTime: 1000 * 60 * 60, // 60 minute
    });

    const response = {
        data: data?.data || ([] as IWorkspace[]),
        count: data?.count || 0,
    };

    return { ...rest, data: response.data, count: response.count };
}
