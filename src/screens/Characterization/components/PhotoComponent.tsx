import { Box, Icon, Image } from 'native-base';
import { StyleSheet, TouchableOpacity } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
import PlaceholderImage from '@assets/placeholder-image.png';
import { MaterialIcons } from '@expo/vector-icons';
import { Orientation } from 'expo-screen-orientation';

type PageProps = {
    orientation: Orientation;
    uri: string;
    handleDeleteImage?: () => void;
    width?: number;
    maxHeight?: number | null;
};

export function PhotoComponent({
    uri,
    orientation,
    handleDeleteImage,
    width = 300,
    maxHeight,
}: PageProps): React.ReactElement {
    const GALLERY_IMAGE_Width = width;
    const GALLERY_IMAGE_PORTRAIT_WIDTH = (((GALLERY_IMAGE_Width * 9) / 16) * 9) / 16;
    const GALLERY_IMAGE_HEIGHT = (GALLERY_IMAGE_Width * 9) / 16;
    const maxHeightValue = maxHeight === undefined ? GALLERY_IMAGE_HEIGHT : maxHeight;

    return (
        <Box
            borderWidth={1}
            borderColor={'gray.200'}
            borderRadius={10}
            flex={1}
            maxHeight={maxHeightValue || undefined}
        >
            <Image
                alt="gallery image"
                source={!uri ? PlaceholderImage : { uri }}
                fallbackSource={PlaceholderImage}
                style={{
                    flex: 1,
                    height: GALLERY_IMAGE_HEIGHT,
                    width: orientation === Orientation.PORTRAIT_UP ? GALLERY_IMAGE_PORTRAIT_WIDTH : GALLERY_IMAGE_Width,
                    resizeMode: 'contain',
                }}
                rounded="lg"
            />
            {handleDeleteImage && (
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteImage()}>
                    <Icon as={MaterialIcons} name="close" fontSize={5} color="white" />
                </TouchableOpacity>
            )}
        </Box>
    );
}

const styles = StyleSheet.create({
    deleteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 15,
        padding: 5,
    },
});
