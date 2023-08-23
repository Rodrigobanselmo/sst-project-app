import { SBox, SImage, SText } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import PlaceholderImage from '@assets/placeholder-image.png';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import withObservables from '@nozbe/with-observables';
import { Orientation } from 'expo-screen-orientation';
import { View, Image, StyleSheet } from 'react-native';

type Props = {
    photo: CharacterizationPhotoModel;
    lenPhoto?: number;
};

export function CharacterizationPhoto({ photo }: Props): React.ReactElement {
    return (
        <SBox style={styles.container}>
            <SImage
                alt="image"
                source={{ uri: photo.photoUrl }}
                fallbackSource={PlaceholderImage}
                style={styles.image}
                rounded={10}
            />
        </SBox>
    );
}

const enhance = withObservables(['photo'], ({ photo }) => ({
    photo,
}));

export const EnhancedCharacterizationPhoto = enhance(CharacterizationPhoto);

const styles = StyleSheet.create({
    container: {
        height: 50,
        minWidth: 80,
        position: 'relative',
    },
    image: {
        height: 50,
        minWidth: 80,
        resizeMode: 'cover',
    },
});
