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
import { IHierarchy } from '@interfaces/IHierarchy';
import { setMapHierarchies } from '../hierarchy/getHierarchies';
import { HierarchyListWithTypes, hierarchyListParents } from '@utils/helpers/hierarchyListParents';
import { usePersistedState } from '@hooks/usePersistState';
import { HIERARCHY_STORAGE } from '@libs/storage/config';
import { useEffect } from 'react';
import { queryClient } from '@services/queryClient';

interface IQuerySync {
    workspaceId?: string;
    companyId: string;
}

export const getHierarchySync = async (query: IQuerySync) => {
    const queries = queryString.stringify({ ...query });
    const response = await api.get<IHierarchy[]>(`${ApiRoutesEnum.SYNC}/hierarchy?${queries}`);

    return response.data;
};

export function useFetchQueryEpis() {
    const fetchHierarchySync = async (query = {} as IQuerySync, take = 20, page = 1) => {
        const data = await queryClient
            .fetchQuery({
                queryKey: [QueryEnum.HIERARCHY, QueryEnum.SYNC, { ...query }],
                queryFn: () => getHierarchySync({ ...query }),
                staleTime: 1000 * 60 * 60, // 60 minute
            })
            .catch((e) => console.error(e));

        return data;
    };

    return { fetchHierarchySync };
}

export const usePersistedStateHierarchy = ({
    companyId = '',
    autoFetch = true,
    workspaceId,
}: {
    workspaceId?: string;
    companyId?: string;
    autoFetch?: boolean;
}) => {
    const { fetchHierarchySync } = useFetchQueryEpis();
    const [hierarchyList, setHierarchyList] = usePersistedState<HierarchyListWithTypes>(HIERARCHY_STORAGE + companyId, {
        hierarchies: [],
        types: [],
    });

    useEffect(() => {
        const fetch = async () => {
            if (autoFetch && companyId) {
                const hierarchies = await fetchHierarchySync({
                    companyId: companyId,
                    workspaceId,
                });

                if (hierarchies) setHierarchyList(hierarchyListParents(hierarchies));
            }

            fetch();
        };
    }, [autoFetch, companyId, setHierarchyList, workspaceId, fetchHierarchySync]);

    return { hierarchyList, setHierarchyList };
};
