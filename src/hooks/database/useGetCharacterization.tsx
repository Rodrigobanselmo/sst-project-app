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
import { CharacterizationRepository } from '@repositories/characterizationRepository';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { unstable_batchedUpdates } from 'react-native';
import { useGetDatabase } from './useGetDatabaseTest';

interface IUseGetDatabase {
    profileId?: string;
    userId?: number;
    ids?: string[];
}

const onGetCharacterization = async ({ ids, profileId, userId }: IUseGetDatabase) => {
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
};

export function useGetCharacterization(props: IUseGetDatabase) {
    const { data, fetch, isLoading, setIsLoading } = useGetDatabase({
        params: props,
        onFetchFunction: (props) => onGetCharacterization(props),
    });

    return { characterizations: data, setIsLoading, isLoading, refetch: fetch };
}
