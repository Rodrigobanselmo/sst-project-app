import { useEffect } from 'react';

import { HierarchyRepository } from '@repositories/hierarchyRepository';
import { useGetDatabase } from './useGetDatabase';

interface IUseGetDatabase {
    workspaceId?: string;
    hierarchyIds?: string[];
}

const onFetchHierarchies = async ({ workspaceId, hierarchyIds }: IUseGetDatabase) => {
    const hierarchyRepository = new HierarchyRepository();
    const hierarchyData = [];

    if (hierarchyIds) {
        const { hierarchies } = await hierarchyRepository.findByIds({ ids: hierarchyIds });
        hierarchyData.push(...hierarchies);
    } else if (workspaceId) {
        const { hierarchies } = await hierarchyRepository.findManyByWorkspace({ workspaceId });
        hierarchyData.push(...hierarchies);
    }

    return hierarchyData;
};

export function useGetHierarchyDatabase({ workspaceId, hierarchyIds }: IUseGetDatabase) {
    const { data, fetch, isLoading, setIsLoading } = useGetDatabase({
        onFetchFunction: () =>
            onFetchHierarchies({
                hierarchyIds,
                workspaceId,
            }),
    });

    useEffect(() => {
        fetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, hierarchyIds]);

    return { hierarchies: data, setIsLoading, isLoading };
}
