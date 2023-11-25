import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { QueryEnum } from '@constants/enums/query.enums';
import { useAuth } from '@hooks/useAuth';
import { IHierarchy, IHierarchyMap } from '@interfaces/IHierarchy';
import { api } from '@services/api';
import { useQuery } from '@tanstack/react-query';
import { emptyMapReturn } from '@utils/helpers/emptyFunc';
import queryString from 'query-string';

export interface IQueryHierarchies {
    companyId?: string;
    workspaceId?: string;
}

export const setMapHierarchies = (hierarchyData: IHierarchy[]) => {
    const hierarchyTree = {} as IHierarchyMap;

    hierarchyData.forEach((hierarchy) => {
        hierarchyTree[hierarchy.id] = { ...hierarchy, children: [] };
    });

    Object.values(hierarchyTree).forEach((hierarchy) => {
        if (hierarchy.parentId) {
            hierarchyTree[hierarchy.parentId].children.push(hierarchy.id);
        }
    });

    return hierarchyTree;
};

export const queryHierarchies = async (query = {} as IQueryHierarchies) => {
    if (!query.companyId) return undefined;
    const queries = queryString.stringify({ ...query, app: true });
    const response = await api.get<IHierarchy[]>(`${ApiRoutesEnum.HIERARCHY}/${query.companyId}?${queries}`);
    return setMapHierarchies(response.data);
};

export function useQueryHierarchies(query = {} as IQueryHierarchies) {
    const { user } = useAuth();
    const companyId = query.companyId || user?.companyId;

    const { data, ...rest } = useQuery({
        queryKey: [QueryEnum.HIERARCHY, companyId],
        queryFn: () => (companyId ? queryHierarchies(query) : <Promise<IHierarchyMap>>emptyMapReturn()),
        staleTime: 1000 * 60 * 60, // 60 minute
    });

    return { ...rest, data: data || ({} as IHierarchyMap) };
}
