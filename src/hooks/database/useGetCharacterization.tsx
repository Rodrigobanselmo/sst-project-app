import { useEffect } from 'react';

import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { CharacterizationRepository } from '@repositories/characterizationRepository';
import { useGetDatabase } from './useGetDatabase';

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

export function useGetCharacterization({ profileId, userId, ids }: IUseGetDatabase) {
    const { data, fetch, isLoading, setIsLoading } = useGetDatabase({
        onFetchFunction: () =>
            onGetCharacterization({
                profileId,
                userId,
                ids,
            }),
    });

    useEffect(() => {
        fetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileId, userId, ids]);

    return { characterizations: data, setIsLoading, isLoading, refetch: fetch };
}
