/* eslint-disable react/prop-types */
import { SBox, SText } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import { SRowCard } from '@components/modelucules/SRowCard';
import { characterizationMap } from '@constants/maps/characterization.map';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import { withObservables } from '@nozbe/watermelondb/react';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { EnhancedCharacterizationPhoto } from './CharacterizationPhoto';
import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import React, { useRef, useState } from 'react';

type Props = {
    characterization: CharacterizationModel;
    photos?: CharacterizationPhotoModel[];
};

export const CharacterizationCardMemo = React.memo<Props & { reload: number }>(
    ({ characterization, photos }) => {
        const { navigate } = useNavigation<AppNavigatorRoutesProps>();

        const handleEditCharacterization = () => {
            navigate('characterization', {
                id: characterization.id,
                workspaceId: characterization.workspaceId,
            });
        };

        return (
            <SRowCard done={!!characterization.done_at?.getTime()} onPress={handleEditCharacterization}>
                <SBox flex={1}>
                    <SText>{characterization.name}</SText>
                    <SText color="text.light">
                        {characterizationMap[characterization.type].type
                            ? characterizationMap[characterization.type].type + ' '
                            : ''}
                        {characterizationMap[characterization.type].name}
                    </SText>
                </SBox>
                {photos?.[0] && (
                    <SBox position="relative">
                        <SBox
                            height={4}
                            width={4}
                            zIndex={1}
                            alignItems="center"
                            justifyContent="center"
                            borderRadius={8}
                            position="absolute"
                            top={1}
                            right={1}
                            bg={'red.700'}
                        >
                            <SText color="white" fontWeight={'bold'} fontSize={'xs'}>
                                {photos.length}
                            </SText>
                        </SBox>
                        <EnhancedCharacterizationPhoto photo={photos[0]} />
                    </SBox>
                )}
            </SRowCard>
        );
        // });
    },
    (prevProps, nextProps) => {
        return nextProps.reload === prevProps.reload;
    },
);

export function CharacterizationCard({ characterization, photos }: Props): React.ReactElement {
    const [reload, setReload] = useState(0);
    const refChar = useRef(0);
    const refPhoto = useRef(0);

    const time = characterization.updated_at?.getTime() || 0;
    const photoLength = photos?.length || 0;

    if (refChar.current != time) setReload((prev) => prev + 1);
    if (refPhoto.current != photoLength) setReload((prev) => prev + 1);

    refChar.current = time;
    refPhoto.current = photoLength;

    return <CharacterizationCardMemo characterization={characterization} photos={photos} reload={reload} />;
}

const enhance = withObservables(['characterization'], ({ characterization }) => {
    let photos: any;

    try {
        photos = characterization.photos;
    } catch (error) {
        photos = undefined;
    }

    return {
        characterization,
        ...(photos && { photos }),
    };
});

const EnhancedCharacterizationCard = enhance(CharacterizationCard);
export default EnhancedCharacterizationCard;
