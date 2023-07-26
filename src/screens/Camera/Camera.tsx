import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { PinchGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';
import { Camera, PhotoFile, VideoFile } from 'react-native-vision-camera';
import { CONTENT_SPACING, SAFE_AREA_PADDING, SCREEN_HEIGHT, SCREEN_WIDTH } from './constants';
// import { StatusBarBlurBackground } from './views/StatusBarBlurBackground';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { calculateActualDimensions } from '@utils/helpers/calculateAspectRatio';
import { Box, Card, FlatList, Icon, Image } from 'native-base';
import { useCameraEffects } from './hooks/useCameraEffects';
import { CaptureButton } from './views/CaptureButton';

const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);
Reanimated.addWhitelistedNativeProps({
    zoom: true,
});

const BUTTON_SIZE = 40;

interface IImageGallery {
    uri: string;
}

export function CameraPage({ navigation }: any): React.ReactElement {
    const camera = useRef<Camera>(null);

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
    } = useCameraEffects();

    const [galleryImages, setGalleryImages] = useState<IImageGallery[]>([]);

    const onMediaCaptured = useCallback(
        (media: PhotoFile | VideoFile, type: 'photo' | 'video') => {
            console.log(`Media captured! ${JSON.stringify(media)}`);

            setGalleryImages((prev) => [...prev, { uri: media.path }]);
            // navigation.navigate('MediaPage', {
            //     path: media.path,
            //     type: type,
            // });
        },
        [navigation],
    );

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
                                    style={StyleSheet.absoluteFill}
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
            </Box>

            <View style={styles.galleryContainer}>
                <FlatList
                    data={galleryImages}
                    renderItem={({ item, index }) => (
                        <Card>
                            <Image
                                alt="gallery image"
                                source={{ uri: item.uri }}
                                resizeMode="contain"
                                style={styles.image}
                            />
                            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteImage(index)}>
                                <Icon as={MaterialIcons} name="delete" fontSize={5} color="red.400" />
                            </TouchableOpacity>
                        </Card>
                    )}
                    keyExtractor={(item, index) => index.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
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
        top: SAFE_AREA_PADDING.paddingTop,
    },
    rightButtonRowRight: {
        position: 'absolute',
        transform: [{ rotate: '90deg' }],
        right: SAFE_AREA_PADDING.paddingTop + 20,
        top: SAFE_AREA_PADDING.paddingRight,
    },
    rightButtonRowLeft: {
        position: 'absolute',
        transform: [{ rotate: '-90deg' }],
        left: SAFE_AREA_PADDING.paddingTop + 20,
        top: SAFE_AREA_PADDING.paddingRight,
    },
    text: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
    },

    galleryContainer: {
        height: 200,
    },
    image: {
        flex: 1,
        height: 150,
        width: 200,
        resizeMode: 'cover',
    },
    deleteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 15,
        padding: 5,
    },
    deleteIcon: {
        fontSize: 20,
        color: 'red',
    },
});
