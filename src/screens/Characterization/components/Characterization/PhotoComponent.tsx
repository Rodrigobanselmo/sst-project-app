import { SBox, SIcon, SImage } from '@components/core';
import { StyleSheet, TouchableOpacity } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
import PlaceholderImage from '@assets/placeholder-image.png';
import { MaterialIcons } from '@expo/vector-icons';
import { Orientation } from 'expo-screen-orientation';

type PageProps = {
    orientation: Orientation;
    uri: string;
    handleDeleteImage?: () => void;
    handleEditImage?: () => void;
    width?: number;
    maxHeight?: number | null;
};

export function PhotoComponent({
    uri,
    orientation,
    handleDeleteImage,
    handleEditImage,
    width = 300,
    maxHeight,
}: PageProps): React.ReactElement {
    const GALLERY_IMAGE_Width = width;
    const GALLERY_IMAGE_PORTRAIT_WIDTH = (((GALLERY_IMAGE_Width * 9) / 16) * 9) / 16;
    const GALLERY_IMAGE_HEIGHT = (GALLERY_IMAGE_Width * 9) / 16;
    const maxHeightValue = maxHeight === undefined ? GALLERY_IMAGE_HEIGHT : maxHeight;
    return (
        <SBox
            borderWidth={1}
            borderColor={'gray.200'}
            borderRadius={10}
            overflow={'hidden'}
            flex={1}
            maxHeight={maxHeightValue || undefined}
        >
            <SImage
                alt="gallery image"
                source={!uri ? PlaceholderImage : { uri }}
                fallbackSource={PlaceholderImage}
                style={{
                    flex: 1,
                    height: GALLERY_IMAGE_HEIGHT,
                    width: orientation === Orientation.PORTRAIT_UP ? GALLERY_IMAGE_PORTRAIT_WIDTH : GALLERY_IMAGE_Width,
                    resizeMode: 'contain',
                }}
            />
            {handleEditImage && (
                <TouchableOpacity style={styles.editButton} onPress={() => handleEditImage()}>
                    <SIcon as={MaterialIcons} name="edit" size={'md'} color="white" />
                </TouchableOpacity>
            )}
            {handleDeleteImage && (
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteImage()}>
                    <SIcon as={MaterialIcons} name="close" size={'md'} color="white" />
                </TouchableOpacity>
            )}
        </SBox>
    );
}

const styles = StyleSheet.create({
    deleteButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 20,
        padding: 8,
        position: 'absolute',
        right: 8,
        top: 8,
    },
    editButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 20,
        padding: 8,
        position: 'absolute',
        right: 8,
        top: 8 + 50,
    },
});
