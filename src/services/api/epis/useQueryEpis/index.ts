import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { QueryEnum } from '@constants/enums/query.enums';
import { IEpi } from '@interfaces/IEpi';
import { IPagination } from '@interfaces/IPagination';
import { IPaginationResult } from '@interfaces/IReactQuery';
import { api } from '@services/api';
import { queryClient } from '@services/queryClient';
import { useQuery } from '@tanstack/react-query';
import queryString from 'query-string';

interface IQueryEpi {
    ca: string;
}

export const getEpis = async ({ skip, take }: IPagination, query: IQueryEpi) => {
    const queries = queryString.stringify(query);

    const response = await api.get<IPaginationResult<IEpi[]>>(
        `${ApiRoutesEnum.EPI}?take=${take}&skip=${skip}&${queries}`,
    );

    return response.data;
};

export function useQueryEpis(page = 0, query = {} as IQueryEpi, take: number) {
    const pagination: IPagination = {
        skip: page * 20,
        take: take || 20,
    };

    const { data, ...result } = useQuery(
        [QueryEnum.EPIS, page, { ...pagination, ...query }],
        () => getEpis(pagination, query),
        {
            staleTime: 1000 * 60 * 60, // 1 hour
        },
    );

    const response = {
        data: data?.data || ([] as IEpi[]),
        count: data?.count || 0,
    };

    return { ...result, data: response.data, count: response.count };
}

export function useFetchQueryEpis() {
    const fetchEpis = async (query = {} as IQueryEpi, take = 20, page = 1) => {
        const pagination: IPagination = {
            skip: (page - 1) * (take || 20),
            take: take || 20,
        };

        const data = await queryClient
            .fetchQuery([QueryEnum.EPIS, page, { ...pagination, ...query }], () => getEpis(pagination, { ...query }), {
                staleTime: 1000 * 60 * 10, // 10 minute
            })
            .catch((e) => console.error(e));
        const response = {
            data: data?.data || ([] as IEpi[]),
            count: data?.count || 0,
        };

        return { data: response.data, count: response.count };
    };

    return { fetchEpis };
}
