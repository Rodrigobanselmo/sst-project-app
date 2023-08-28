import { useCallback, useContext, useEffect, useState } from 'react';

import { AuthContext } from '@contexts/AuthContext';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { UserAuthRepository } from '@repositories/userAuthRepository';
import { useAuth } from './useAuth';
import { database } from '@libs/watermelon';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { RiskRepository } from '@repositories/riskRepository';
import { HierarchyRepository } from '@repositories/hierarchyRepository';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { useSync } from '@hooks/useSync';
import { getHierarchySync } from '@services/api/sync/getHierarchySync';

interface IUseGetDatabase {
    workspaceId?: string;
    hierarchyIds?: string[];
}

export function useGetHierarchyDatabase({ workspaceId, hierarchyIds }: IUseGetDatabase) {
    const [hierarchies, setHierarchy] = useState<HierarchyModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { syncChanges } = useSync();

    const fetchHierarchies = useCallback(async () => {
        try {
            const hierarchyRepository = new HierarchyRepository();
            const hierarchyData = [];

            if (hierarchyIds) {
                const { hierarchies } = await hierarchyRepository.findByIds({ ids: hierarchyIds });
                hierarchyData.push(...hierarchies);
            } else if (workspaceId) {
                const { hierarchies } = await hierarchyRepository.findManyByWorkspace({ workspaceId });
                hierarchyData.push(...hierarchies);
            }

            const hTable = database.get<HierarchyModel>(DBTablesEnum.HIERARCHY);
            const hhh = await hTable.query().fetch();
            console.log(hhh.length);

            setHierarchy(hierarchyData);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        let isMounted = true;

        if (isMounted) {
            fetchHierarchies();
        }

        return () => {
            isMounted = false;
        };
    }, [fetchHierarchies]);

    return { hierarchies, setIsLoading, isLoading };
}
