import { SButton, SHomeHeader } from '@components/index';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { SVStack, useSToast } from '@components/core';
import { useState } from 'react';
import { RiskTable } from '@screens/Characterization/components/Risk/RiskTable';
import { CharacterizationForm } from '@screens/Characterization/components/Characterization/CharacterizationForm';
import { useYupValidationResolver } from '@hooks/useYupValidationResolver';
import { ICharacterizationValues, characterizationSchema } from '@screens/Characterization/schemas';
import { useForm } from 'react-hook-form';

export const Test = () => {
    const resolver = useYupValidationResolver(characterizationSchema);
    const { control, trigger, getValues, setValue } = useForm<ICharacterizationValues>({
        resolver,
    });

    return (
        <SVStack flex={1}>
            <SHomeHeader />
            <CharacterizationForm
                profilesProps={{
                    isPrincipalProfile: true,
                }}
                onSaveForm={async () => {}}
                onEditForm={async () => {}}
                control={control}
                openCamera={async () => null}
                audios={[]}
                videos={[]}
                photos={[]}
                selectedId={''}
            />
        </SVStack>
    );
};
