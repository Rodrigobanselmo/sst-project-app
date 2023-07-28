import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { PinchGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';
import { Camera, PhotoFile, VideoFile } from 'react-native-vision-camera';
import { CONTENT_SPACING, GALLERY_IMAGE_Width, SAFE_AREA_PADDING, SCREEN_HEIGHT, SCREEN_WIDTH } from './constants';
// import { StatusBarBlurBackground } from './views/StatusBarBlurBackground';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { calculateActualDimensions } from '@utils/helpers/calculateAspectRatio';
import { Box, Text, FlatList, Icon, Image, Center, HStack } from 'native-base';
import { useCameraEffects } from './hooks/useCameraEffects';
import { CaptureButton } from './views/CaptureButton';
import { isAndroid } from '@utils/helpers/getPlataform';
import { manipulateAsync, FlipType, SaveFormat, ImageResult } from 'expo-image-manipulator';
import { Orientation, OrientationChangeEvent } from 'expo-screen-orientation';
import * as FileSystem from 'expo-file-system';
import { saveImageToGallery, saveImageToStorage } from '@utils/helpers/saveImage';
import { Button } from '@components/Button';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps, AppRoutesProps } from '@routes/app/AppRoutesProps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);
Reanimated.addWhitelistedNativeProps({
    zoom: true,
});

const BUTTON_SIZE = 40;

interface IImageGallery {
    uri: string;
    orientation: Orientation;
}

type CameraPageProps = NativeStackScreenProps<AppRoutesProps, 'camera'>;

export function CameraPage({ navigation }: CameraPageProps): React.ReactElement {
    const camera = useRef<Camera>(null);
    const { goBack } = useNavigation<AppNavigatorRoutesProps>();

    const {
        isActive,
        isCameraInitialized,
        cameraAnimatedProps,
        onError,
        onInitialized,
        onFlipCameraPressed,
        onFlashPressed,
        onDoubleTap,
        onPinchGesture,
        setIsPressingButton,
        flash,
        enableNightMode,
        setEnableNightMode,
        supportsCameraFlipping,
        supportsFlash,
        canToggleNightMode,
        isPortrait,
        isLandscapeRight,
        device,
        zoom,
        minZoom,
        maxZoom,
        orientation,
    } = useCameraEffects();

    const [galleryImages, setGalleryImages] = useState<IImageGallery[]>([]);

    const onMediaCaptured = useCallback(
        async (media: PhotoFile | VideoFile, options: { type: 'photo' | 'video'; orientation: Orientation }) => {
            const uri = isAndroid() ? 'file://' + media.path : media.path;

            // const isLandscape = [Orientation.LANDSCAPE_LEFT, Orientation.LANDSCAPE_RIGHT].includes(options.orientation);

            // const { height, width } = calculateActualDimensions({
            //     aspectRatio: '9:16',
            //     maxWidth: 900,
            //     maxHeight: 1200,
            //     ...(isLandscape && {
            //         aspectRatio: '16:9',
            //         maxWidth: 1200,
            //         maxHeight: 900,
            //     }),
            // });

            // let manipResult: ImageResult;
            // if (options.orientation === Orientation.LANDSCAPE_RIGHT) {
            //     manipResult = await manipulateAsync(uri, [{ rotate: -90 }, { resize: { height, width } }], {
            //         compress: 0.6,
            //     });
            // } else if (options.orientation === Orientation.LANDSCAPE_LEFT) {
            //     manipResult = await manipulateAsync(uri, [{ rotate: 90 }, { resize: { height, width } }], {
            //         compress: 0.6,
            //     });
            // } else {
            //     manipResult = await manipulateAsync(uri, [{ resize: { height, width } }], {
            //         compress: 0.6,
            //     });
            // }

            // const asset = await saveImageToGallery(manipResult.uri);

            // if (asset) {
            // }

            setGalleryImages((prev) => [...prev, { uri, orientation: options.orientation }]);
            // navigation.navigate('MediaPage', {
            //     path: media.path,
            //     type: type,
            // });
        },
        [navigation],
    );

    const handleCancel = () => {
        goBack();
    };

    const { height, width } = calculateActualDimensions({
        aspectRatio: '9:16',
        maxWidth: SCREEN_WIDTH,
        maxHeight: SCREEN_HEIGHT,
    });

    const handleDeleteImage = (index: number) => {
        const updatedImages = [...galleryImages];
        updatedImages.splice(index, 1);
        setGalleryImages(updatedImages);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <Box width={width} height={height}>
                {device != null && (
                    <PinchGestureHandler onGestureEvent={onPinchGesture} enabled={isActive}>
                        <Reanimated.View style={StyleSheet.absoluteFill}>
                            <TapGestureHandler onEnded={onDoubleTap} numberOfTaps={2}>
                                <ReanimatedCamera
                                    ref={camera}
                                    style={{
                                        flex: 1,
                                        backgroundColor: 'black',
                                        aspectRatio: 9 / 16,
                                    }}
                                    device={device}
                                    lowLightBoost={device.supportsLowLightBoost && enableNightMode}
                                    isActive={isActive}
                                    onInitialized={onInitialized}
                                    onError={onError}
                                    enableZoomGesture={false}
                                    animatedProps={cameraAnimatedProps}
                                    photo={true}
                                    video={false}
                                    audio={false}
                                    orientation={'portrait'}
                                />
                            </TapGestureHandler>
                        </Reanimated.View>
                    </PinchGestureHandler>
                )}

                <CaptureButton
                    style={styles.captureButton}
                    camera={camera}
                    onMediaCaptured={onMediaCaptured}
                    cameraZoom={zoom}
                    minZoom={minZoom}
                    maxZoom={maxZoom}
                    flash={supportsFlash ? flash : 'off'}
                    enabled={isCameraInitialized && isActive}
                    setIsPressingButton={setIsPressingButton}
                    orientation={orientation}
                />
                <View
                    style={
                        isPortrait
                            ? styles.rightButtonRow
                            : isLandscapeRight
                            ? styles.rightButtonRowRight
                            : styles.rightButtonRowLeft
                    }
                >
                    {supportsCameraFlipping && (
                        <TouchableOpacity style={styles.button} onPress={onFlipCameraPressed}>
                            <Icon as={Ionicons} name="camera-reverse" color="white" size={5} />
                        </TouchableOpacity>
                    )}
                    {supportsFlash && (
                        <TouchableOpacity style={styles.button} onPress={onFlashPressed}>
                            <Icon as={Ionicons} name={flash === 'on' ? 'flash' : 'flash-off'} color="white" size={5} />
                        </TouchableOpacity>
                    )}
                    {canToggleNightMode && (
                        <TouchableOpacity style={styles.button} onPress={() => setEnableNightMode(!enableNightMode)}>
                            <Icon
                                as={Ionicons}
                                name={enableNightMode ? 'moon' : 'moon-outline'}
                                color="white"
                                size={5}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.galleryContainer}>
                    <FlatList
                        data={galleryImages}
                        ItemSeparatorComponent={() => <Box style={{ height: 10 }} />}
                        renderItem={({ item, index }) => (
                            <Box
                                style={
                                    item.orientation === Orientation.PORTRAIT_UP
                                        ? { flex: 1, backgroundColor: 'red' }
                                        : styles.imageBoxH
                                }
                            >
                                <Image
                                    alt="gallery image"
                                    source={{ uri: item.uri }}
                                    style={
                                        item.orientation === Orientation.PORTRAIT_UP
                                            ? styles.image
                                            : item.orientation == Orientation.LANDSCAPE_LEFT
                                            ? styles.imageLL
                                            : styles.imageLR
                                    }
                                />
                                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteImage(index)}>
                                    <Icon as={MaterialIcons} name="close" fontSize={5} color="white" />
                                </TouchableOpacity>
                            </Box>
                        )}
                        keyExtractor={(item, index) => index.toString()}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                    />
                    {galleryImages.length > 2 && (
                        <Center px={2} borderRadius={10} position={'absolute'} bottom={-30} mt={2} bg="#00000044">
                            <Text fontSize={12} color="white">
                                Total: {galleryImages.length}
                            </Text>
                        </Center>
                    )}
                </View>

                <TouchableOpacity onPress={handleCancel}>
                    <Center
                        py={1}
                        px={4}
                        borderRadius={10}
                        position={'absolute'}
                        left={10}
                        bottom={SAFE_AREA_PADDING.paddingBottom + 28}
                        bg="#00000044"
                        borderStyle={'solid'}
                        borderWidth={1}
                        width={85}
                        borderColor={'gray.300'}
                    >
                        <Text fontSize={12} color="gray.200">
                            Cancelar
                        </Text>
                    </Center>
                </TouchableOpacity>

                {!!galleryImages.length && (
                    <TouchableOpacity disabled={!galleryImages.length} onPress={() => console.log(1)}>
                        <Center
                            px={4}
                            py={1}
                            borderRadius={10}
                            position={'absolute'}
                            right={10}
                            bottom={SAFE_AREA_PADDING.paddingBottom + 28}
                            borderStyle={'solid'}
                            borderWidth={1}
                            width={85}
                            borderColor={'primary.main'}
                            bg="#00000044"
                        >
                            <Text fontSize={12} color="primary.main">
                                Salvar
                            </Text>
                        </Center>
                    </TouchableOpacity>
                )}
            </Box>

            {/* <HStack justifyContent={'space-between'} width={'100%'} px={5}>
                <Button title="Cancelar" onPress={console.log} variant="outline" width={100} />
                <Button title="Salvar" onPress={console.log} width={100} />
            </HStack> */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        // width: '300px',
        // height: '200px',
    },
    captureButton: {
        position: 'absolute',
        alignSelf: 'center',
        bottom: SAFE_AREA_PADDING.paddingBottom,
    },
    button: {
        marginBottom: CONTENT_SPACING,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BUTTON_SIZE / 2,
        backgroundColor: 'rgba(140, 140, 140, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rightButtonRow: {
        position: 'absolute',
        right: SAFE_AREA_PADDING.paddingRight,
        top: isAndroid() ? SAFE_AREA_PADDING.paddingTop + 30 : SAFE_AREA_PADDING.paddingTop,
    },
    rightButtonRowRight: {
        position: 'absolute',
        transform: [{ rotate: '90deg' }],
        right: SAFE_AREA_PADDING.paddingTop + 30,
        top: isAndroid() ? SAFE_AREA_PADDING.paddingRight + 20 : SAFE_AREA_PADDING.paddingRight,
    },
    rightButtonRowLeft: {
        position: 'absolute',
        transform: [{ rotate: '-90deg' }],
        right: SAFE_AREA_PADDING.paddingTop + 30,
        top: isAndroid() ? SAFE_AREA_PADDING.paddingRight + 20 : SAFE_AREA_PADDING.paddingRight,
    },
    text: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
    },

    galleryContainer: {
        position: 'absolute',
        height: 350,
        top: 50,
        left: 10,
    },
    image: {
        flex: 1,
        height: (GALLERY_IMAGE_Width * 16) / 9,
        width: GALLERY_IMAGE_Width,
        resizeMode: 'stretch',
    },
    imageLR: {
        flex: 1,
        width: (GALLERY_IMAGE_Width * 9) / 16,
        height: GALLERY_IMAGE_Width,
        transform: [{ rotate: '-90deg' }],
        resizeMode: 'stretch',
        position: 'absolute',
        top: -17.5,
        left: 17.5,
    },
    imageLL: {
        flex: 1,
        width: (GALLERY_IMAGE_Width * 9) / 16,
        height: GALLERY_IMAGE_Width,
        transform: [{ rotate: '90deg' }],
        resizeMode: 'stretch',
        position: 'absolute',
        top: -17.5,
        left: 17.5,
    },
    imageBoxH: {
        flex: 1,
        height: (GALLERY_IMAGE_Width * 9) / 16,
        width: GALLERY_IMAGE_Width,
        position: 'relative',
    },
    deleteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 15,
        padding: 5,
    },
    deleteIcon: {
        fontSize: 20,
    },
});
