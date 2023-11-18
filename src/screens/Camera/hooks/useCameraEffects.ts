import { useDeviceRotation } from '@hooks/useDeviceRotation';
import { useIsFocused } from '@react-navigation/core';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PinchGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import {
    Extrapolate,
    interpolate,
    useAnimatedGestureHandler,
    useAnimatedProps,
    useSharedValue,
} from 'react-native-reanimated';
import { CameraRuntimeError, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import { MAX_ZOOM_FACTOR, SCREEN_HEIGHT, SCREEN_WIDTH } from '../../../constants/constants';
import { useIsForeground } from './useIsForeground';

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

    const [targetFps, setTargetFps] = useState(60);
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
            try {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            } catch (e) {
                console.error(e);
            }
        }

        changeScreenOrientation();

        return () => {
            ScreenOrientation.unlockAsync();
        };
    }, []);

    const device = useCameraDevice(cameraPosition, {
        physicalDevices: ['ultra-wide-angle-camera', 'wide-angle-camera', 'telephoto-camera'],
    });

    const screenAspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
    const format = useCameraFormat(device, [
        { fps: targetFps },
        { videoAspectRatio: screenAspectRatio },
        { videoResolution: 'max' },
        { photoAspectRatio: screenAspectRatio },
        { photoResolution: 'max' },
    ]);

    const fps = Math.min(format?.maxFps ?? 1, targetFps);

    const supportsCameraFlipping = true;
    const supports60Fps = useMemo(() => device?.formats.some((f) => f.maxFps >= 60), [device?.formats]);
    const supportsFlash = device?.hasFlash ?? false;
    const canToggleNightMode = device?.supportsLowLightBoost ?? false;

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
        orientation,
        supports60Fps,
        format,
    };
};
