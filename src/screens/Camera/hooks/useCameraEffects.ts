import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PinchGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import {
    Extrapolate,
    interpolate,
    useAnimatedGestureHandler,
    useAnimatedProps,
    useSharedValue,
} from 'react-native-reanimated';
import {
    Camera,
    CameraDeviceFormat,
    CameraRuntimeError,
    PhotoFile,
    VideoFile,
    frameRateIncluded,
    sortFormats,
    useCameraDevices,
} from 'react-native-vision-camera';
import { MAX_ZOOM_FACTOR } from '../constants';
import { useIsForeground } from './useIsForeground';
import { useDeviceRotation } from '@hooks/useDeviceRotation';
import { useIsFocused } from '@react-navigation/core';
import * as ScreenOrientation from 'expo-screen-orientation';

const SCALE_FULL_ZOOM = 3;

export const useCameraEffects = () => {
    const [isCameraInitialized, setIsCameraInitialized] = useState(false);
    const zoom = useSharedValue(0);
    const isPressingButton = useSharedValue(false);

    const isFocussed = useIsFocused();
    const isForeground = useIsForeground();
    const isActive = isFocussed && isForeground;

    const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('back');
    const [flash, setFlash] = useState<'off' | 'on'>('off');
    const [enableNightMode, setEnableNightMode] = useState(false);

    const { orientation } = useDeviceRotation();

    const isPortrait = useMemo(() => {
        return orientation === ScreenOrientation.Orientation.PORTRAIT_UP;
    }, [orientation]);

    const isLandscapeLeft = useMemo(() => {
        return orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT;
    }, [orientation]);

    const isLandscapeRight = useMemo(() => {
        return orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
    }, [orientation]);

    useEffect(() => {
        async function changeScreenOrientation() {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        }

        changeScreenOrientation();

        return () => {
            ScreenOrientation.unlockAsync();
        };
    }, []);

    const devices = useCameraDevices();
    const device = devices[cameraPosition];

    const formats = useMemo<CameraDeviceFormat[]>(() => {
        if (device?.formats == null) return [];
        return device.formats.sort(sortFormats);
    }, [device?.formats]);

    const fps = useMemo(() => {
        if (enableNightMode && !device?.supportsLowLightBoost) {
            return 30;
        }

        const supports60Fps = formats.some((f) => f.frameRateRanges.some((r) => frameRateIncluded(r, 60)));
        if (!supports60Fps) {
            return 30;
        }
        return 60;
    }, [device?.supportsLowLightBoost, enableNightMode, formats]);

    const supportsCameraFlipping = useMemo(
        () => devices.back != null && devices.front != null,
        [devices.back, devices.front],
    );
    const supportsFlash = device?.hasFlash ?? false;
    const canToggleNightMode = enableNightMode ? true : (device?.supportsLowLightBoost ?? false) || fps > 30;

    const minZoom = device?.minZoom ?? 1;
    const maxZoom = Math.min(device?.maxZoom ?? 1, MAX_ZOOM_FACTOR);

    const cameraAnimatedProps = useAnimatedProps(() => {
        const z = Math.max(Math.min(zoom.value, maxZoom), minZoom);
        return {
            zoom: z,
        };
    }, [maxZoom, minZoom, zoom]);

    const setIsPressingButton = useCallback(
        (_isPressingButton: boolean) => {
            isPressingButton.value = _isPressingButton;
        },
        [isPressingButton],
    );

    const onError = useCallback((error: CameraRuntimeError) => {
        console.error(error);
    }, []);

    const onInitialized = useCallback(() => {
        setIsCameraInitialized(true);
    }, []);

    const onFlipCameraPressed = useCallback(() => {
        setCameraPosition((p) => (p === 'back' ? 'front' : 'back'));
    }, []);

    const onFlashPressed = useCallback(() => {
        setFlash((f) => (f === 'off' ? 'on' : 'off'));
    }, []);

    const onDoubleTap = useCallback(() => {
        onFlipCameraPressed();
    }, [onFlipCameraPressed]);

    const neutralZoom = device?.neutralZoom ?? 1;
    useEffect(() => {
        zoom.value = neutralZoom;
    }, [neutralZoom, zoom]);

    const onPinchGesture = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent, { startZoom?: number }>({
        onStart: (_, context) => {
            context.startZoom = zoom.value;
        },
        onActive: (event, context) => {
            const startZoom = context.startZoom ?? 0;
            const scale = interpolate(
                event.scale,
                [1 - 1 / SCALE_FULL_ZOOM, 1, SCALE_FULL_ZOOM],
                [-1, 0, 1],
                Extrapolate.CLAMP,
            );
            zoom.value = interpolate(scale, [-1, 0, 1], [minZoom, startZoom, maxZoom], Extrapolate.CLAMP);
        },
    });

    return {
        isActive,
        isCameraInitialized,
        cameraAnimatedProps,
        onError,
        onInitialized,
        onFlipCameraPressed,
        onFlashPressed,
        onDoubleTap,
        onPinchGesture,
        isPressingButton,
        setIsPressingButton,
        cameraPosition,
        flash,
        enableNightMode,
        setEnableNightMode,
        supportsCameraFlipping,
        supportsFlash,
        canToggleNightMode,
        fps,
        isPortrait,
        isLandscapeLeft,
        isLandscapeRight,
        device,
        zoom,
        minZoom,
        maxZoom,
    };
};
