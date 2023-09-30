import { useCallback, useContext, useEffect, useState } from 'react';

import { AuthContext } from '@contexts/AuthContext';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { UserAuthRepository } from '@repositories/userAuthRepository';
import { useAuth } from '../useAuth';
import { database } from '@libs/watermelon';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { RiskRepository } from '@repositories/riskRepository';
import { HierarchyRepository } from '@repositories/hierarchyRepository';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { useSync } from '@hooks/useSync';
import { getHierarchySync } from '@services/api/sync/getHierarchySync';
import { WorkspaceHierarchyModel } from '@libs/watermelon/model/_MMModel/WorkspaceHierarchyModel';
import { useGetDatabase } from './useGetDatabase';
import { CharacterizationRepository } from '@repositories/characterizationRepository';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';

interface IUseGetDatabase {
    profileId?: string;
    userId?: number;
    ids?: string[];
}

export function useGetCharacterization({ profileId, userId, ids }: IUseGetDatabase) {
    const onFetchFunction = useCallback(async () => {
        const characterizationRepository = new CharacterizationRepository();
        const characterizationsData: CharacterizationModel[] = [];

        if (profileId) {
            const { characterizations } = await characterizationRepository.findByProfileId({ profileId });
            characterizationsData.push(...characterizations);
        } else if (ids) {
            const { characterizations } = await characterizationRepository.findByIds({ ids });
            characterizationsData.push(...characterizations);
        } else if (userId) {
            const { characterizations } = await characterizationRepository.findMany({ userId });
            characterizationsData.push(...characterizations);
        }

        return characterizationsData;
    }, [profileId, userId, ids]);

    const { data, isError, isLoading, setIsLoading, refetch } = useGetDatabase({
        onFetchFunction,
    });

    return { characterizations: data, isError, setIsLoading, isLoading, refetch };
}
