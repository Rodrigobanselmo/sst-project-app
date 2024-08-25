import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { PinchGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';
import { Camera, PhotoFile, VideoFile } from 'react-native-vision-camera';
import { CONTENT_SPACING, SAFE_AREA_PADDING, SCREEN_HEIGHT, SCREEN_WIDTH } from '../../constants/constants';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { calculateActualDimensions } from '@utils/helpers/calculateAspectRatio';
import { isAndroid } from '@utils/helpers/getPlataform';
import { saveImageOrVideoToGallery } from '@utils/helpers/saveAsset';
import { ImageResult, manipulateAsync } from 'expo-image-manipulator';
import { Orientation } from 'expo-screen-orientation';
import { SBox, SCenter, SFlatList, SIcon, SImage, SSpinner, SText, useSToast } from '@components/core';
import { useCameraEffects } from './hooks/useCameraEffects';
import { IImageGallery } from './types';
import { CaptureButton } from './views/CaptureButton';

const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);
Reanimated.addWhitelistedNativeProps({
    zoom: true,
});

const BUTTON_SIZE = 40;
const GALLERY_IMAGE_Width = 80;

type CameraPageProps = {
    onCancel: () => void;
    onSave: (args: { photos: IImageGallery[] }) => void;
};

export function CameraPage({ onSave, onCancel }: CameraPageProps): React.ReactElement {
    const camera = useRef<Camera>(null);
    const [isLoading, setIsLoading] = useState(false);
    const toast = useSToast();

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
        format,
    } = useCameraEffects();

    const [galleryImages, setGalleryImages] = useState<IImageGallery[]>([]);

    const onMediaCaptured = useCallback(
        async (media: PhotoFile | VideoFile, options: { type: 'photo' | 'video'; orientation: Orientation }) => {
            const uri = isAndroid() ? 'file://' + media.path : media.path;
            setGalleryImages((prev) => [...prev, { uri, orientation: options.orientation }]);
        },
        [],
    );

    const handleSave = useCallback(async () => {
        setIsLoading(true);
        const saveImages: IImageGallery[] = [];

        try {
            await Promise.all(
                galleryImages.map(async (image) => {
                    const uri = image.uri;

                    const isLandscape = [Orientation.LANDSCAPE_LEFT, Orientation.LANDSCAPE_RIGHT].includes(
                        image.orientation,
                    );

                    const { height, width } = calculateActualDimensions({
                        aspectRatio: '9:16',
                        maxWidth: 900,
                        maxHeight: 1200,
                        ...(isLandscape && {
                            aspectRatio: '16:9',
                            maxWidth: 1200,
                            maxHeight: 900,
                        }),
                    });

                    let manipResult: ImageResult;
                    if (image.orientation === Orientation.LANDSCAPE_RIGHT) {
                        manipResult = await manipulateAsync(uri, [{ rotate: -90 }, { resize: { height, width } }], {
                            compress: 0.6,
                        });
                    } else if (image.orientation === Orientation.LANDSCAPE_LEFT) {
                        manipResult = await manipulateAsync(uri, [{ rotate: 90 }, { resize: { height, width } }], {
                            compress: 0.6,
                        });
                    } else {
                        manipResult = await manipulateAsync(uri, [{ resize: { height, width } }], {
                            compress: 0.6,
                        });
                    }

                    const asset = await saveImageOrVideoToGallery(manipResult.uri);

                    if (asset) {
                        saveImages.push({
                            uri: asset.uri,
                            orientation: image.orientation,
                        });
                    }
                }),
            );
        } catch (error) {
            // TODO
            // toast.show({
            //     placement: 'top',
            //     title: 'Erro ao salvar imagem',
            //     bgColor: 'status.error',
            //     description: 'Ocorreu um erro ao salvar a imagem, tente novamente.',
            // });
        }

        onSave({ photos: saveImages });

        setIsLoading(false);
    }, [onSave, galleryImages]);

    const handleCancel = () => {
        onCancel();
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
            <SBox width={width} height={height}>
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
                                    format={format}
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
                    enabled={!isLoading && isCameraInitialized && isActive}
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
                            <SIcon as={Ionicons} name="camera-reverse" color="white" size={5} />
                        </TouchableOpacity>
                    )}
                    {supportsFlash && (
                        <TouchableOpacity style={styles.button} onPress={onFlashPressed}>
                            <SIcon as={Ionicons} name={flash === 'on' ? 'flash' : 'flash-off'} color="white" size={5} />
                        </TouchableOpacity>
                    )}
                    {canToggleNightMode && (
                        <TouchableOpacity style={styles.button} onPress={() => setEnableNightMode(!enableNightMode)}>
                            <SIcon
                                as={Ionicons}
                                name={enableNightMode ? 'moon' : 'moon-outline'}
                                color="white"
                                size={5}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.galleryContainer}>
                    <SFlatList
                        data={galleryImages}
                        ItemSeparatorComponent={() => <SBox style={{ height: 10 }} />}
                        renderItem={({ item, index }) => (
                            <SBox style={item.orientation === Orientation.PORTRAIT_UP ? { flex: 1 } : styles.imageBoxH}>
                                <SImage
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
                                <TouchableOpacity
                                    disabled={isLoading}
                                    style={styles.deleteButton}
                                    onPress={() => handleDeleteImage(index)}
                                >
                                    <SIcon as={MaterialIcons} name="close" fontSize={5} color="white" />
                                </TouchableOpacity>
                            </SBox>
                        )}
                        keyExtractor={(item, index) => index.toString()}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                    />
                    {galleryImages.length > 2 && (
                        <SCenter px={2} borderRadius={10} position={'absolute'} bottom={-30} mt={2} bg="#00000044">
                            <SText fontSize={12} color="white">
                                Total: {galleryImages.length}
                            </SText>
                        </SCenter>
                    )}
                </View>

                <SBox bottom={SAFE_AREA_PADDING.paddingBottom + 28} position={'absolute'} left={10}>
                    <TouchableOpacity onPress={() => handleCancel()}>
                        <SCenter
                            py={1}
                            px={4}
                            borderRadius={10}
                            bg="#00000044"
                            borderStyle={'solid'}
                            borderWidth={1}
                            width={85}
                            borderColor={'gray.300'}
                        >
                            <SText fontSize={12} color="gray.200">
                                Cancelar
                            </SText>
                        </SCenter>
                    </TouchableOpacity>
                </SBox>

                {!!galleryImages.length && (
                    <SBox bottom={SAFE_AREA_PADDING.paddingBottom + 28} position={'absolute'} right={10}>
                        <TouchableOpacity disabled={isLoading || !galleryImages.length} onPress={handleSave}>
                            {isLoading ? (
                                <SSpinner color="primary.main" size={32} />
                            ) : (
                                <SCenter
                                    px={4}
                                    py={1}
                                    borderRadius={10}
                                    borderStyle={'solid'}
                                    borderWidth={1}
                                    width={85}
                                    borderColor={'primary.main'}
                                    bg="#00000044"
                                >
                                    <SText fontSize={12} color="primary.main">
                                        Salvar
                                    </SText>
                                </SCenter>
                            )}
                        </TouchableOpacity>
                    </SBox>
                )}
            </SBox>
        </View>
    );
}

const styles = StyleSheet.create({
    button: {
        alignItems: 'center',
        backgroundColor: 'rgba(140, 140, 140, 0.3)',
        borderRadius: BUTTON_SIZE / 2,
        height: BUTTON_SIZE,
        justifyContent: 'center',
        marginBottom: CONTENT_SPACING,
        width: BUTTON_SIZE,
    },
    captureButton: {
        alignSelf: 'center',
        bottom: SAFE_AREA_PADDING.paddingBottom,
        position: 'absolute',
    },
    container: {
        alignItems: 'center',
        backgroundColor: 'black',
        flex: 1,
        justifyContent: 'center',
    },
    deleteButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 15,
        padding: 5,
        position: 'absolute',
        right: 8,
        top: 8,
    },
    galleryContainer: {
        height: 350,
        left: 10,
        position: 'absolute',
        top: 50,
    },
    image: {
        flex: 1,
        height: (GALLERY_IMAGE_Width * 16) / 9,
        resizeMode: 'stretch',
        width: GALLERY_IMAGE_Width,
    },
    imageBoxH: {
        flex: 1,
        height: (GALLERY_IMAGE_Width * 9) / 16,
        position: 'relative',
        width: GALLERY_IMAGE_Width,
    },
    imageLL: {
        flex: 1,
        height: GALLERY_IMAGE_Width,
        left: 17.5,
        position: 'absolute',
        resizeMode: 'stretch',
        top: -17.5,
        transform: [{ rotate: '90deg' }],
        width: (GALLERY_IMAGE_Width * 9) / 16,
    },
    imageLR: {
        flex: 1,
        height: GALLERY_IMAGE_Width,
        left: 17.5,
        position: 'absolute',
        resizeMode: 'stretch',
        top: -17.5,
        transform: [{ rotate: '-90deg' }],
        width: (GALLERY_IMAGE_Width * 9) / 16,
    },
    rightButtonRow: {
        position: 'absolute',
        right: SAFE_AREA_PADDING.paddingRight,
        top: isAndroid() ? SAFE_AREA_PADDING.paddingTop + 30 : SAFE_AREA_PADDING.paddingTop,
    },
    rightButtonRowLeft: {
        position: 'absolute',
        right: SAFE_AREA_PADDING.paddingTop + 30,
        top: isAndroid() ? SAFE_AREA_PADDING.paddingRight + 20 : SAFE_AREA_PADDING.paddingRight,
        transform: [{ rotate: '-90deg' }],
    },
    rightButtonRowRight: {
        position: 'absolute',
        right: SAFE_AREA_PADDING.paddingTop + 30,
        top: isAndroid() ? SAFE_AREA_PADDING.paddingRight + 20 : SAFE_AREA_PADDING.paddingRight,
        transform: [{ rotate: '90deg' }],
    },
});
