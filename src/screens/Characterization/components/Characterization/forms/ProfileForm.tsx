import { SBox, SHStack, SScrollView, SSpinner, SVStack } from '@components/core';
import React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { CharacterizationFormProps } from '../../../types';
// import * as ImagePicker from 'expo-image-picker';
import { SButton, SInput, SInputArea, SNoContent } from '@components/index';
import { SHorizontalMenuScroll } from '@components/modelucules/SHorizontalMenuScroll';
import { SLabel } from '@components/modelucules/SLabel';
import { SRadio } from '@components/modelucules/SRadio';
import { SAFE_AREA_PADDING, pagePadding } from '@constants/constants';
import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { characterizationMap } from '@constants/maps/characterization.map';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { Control, Controller } from 'react-hook-form';
import { ICharacterizationValues } from '../../../schemas';
import { AudioForm } from './AudioForm';
import { PhotoForm } from './PhotoForm';
import { VideoForm } from './VideoForm';
import { useGetCharacterization } from '@hooks/database/useGetCharacterization';

type PageProps = {
    onChangeProfile: (characterzationId: string) => Promise<void>;
    onAddProfile: (options: { refetchProfiles: () => Promise<void> }) => Promise<void>;
};

export function ProfileForm({ onAddProfile, onChangeProfile }: PageProps): React.ReactElement {
    const principalProfileId = useCharacterizationFormStore((state) => state.getPrincipalProfileId());
    const characterizationId = useCharacterizationFormStore((state) => state.getCharacterizationId());

    const {
        characterizations: characterizationsProfiles,
        isLoading: isLoadingProfiles,
        refetch: refetchProfiles,
    } = useGetCharacterization({
        profileId: principalProfileId,
    });

    const profileOptions = [
        { value: principalProfileId || '', name: 'Principal' },
        ...(characterizationsProfiles || []).map((profile) => ({
            value: profile.id,
            name: profile.profileName || 'Novo Perfil',
        })),
    ];

    return (
        <>
            <SHStack justifyContent="space-between" alignItems="center">
                <SLabel mb={2}>Perfil</SLabel>
                <SButton
                    title="Novo Perfil"
                    bg="green.500"
                    autoWidth
                    variant={'outline'}
                    height={7}
                    py={0}
                    onPress={() => onAddProfile({ refetchProfiles: refetchProfiles })}
                />
            </SHStack>

            {isLoadingProfiles ? (
                <SSpinner color="primary.main" size={32} />
            ) : (
                <>
                    {profileOptions.length > 1 ? (
                        <SHorizontalMenuScroll
                            activeColor="primary.light"
                            mb={4}
                            paddingHorizontal={0}
                            onChange={(value) => value.value && onChangeProfile?.(value.value)}
                            options={profileOptions}
                            getKeyExtractor={(item) => item.value}
                            getLabel={(item) => item.name}
                            getIsActive={(item) => item.value === characterizationId}
                        />
                    ) : (
                        <SNoContent width={'100%'} my={'12px'} text="nenhum perfil encontrado" />
                    )}
                </>
            )}
        </>
    );
}
