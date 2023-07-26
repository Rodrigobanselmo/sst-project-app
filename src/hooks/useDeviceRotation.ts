import { useLayoutEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { Accelerometer } from 'expo-sensors';
import * as ScreenOrientation from 'expo-screen-orientation';

export const useDeviceRotation = () => {
    const [orientation, setOrientation] = useState(ScreenOrientation.Orientation.PORTRAIT_UP);
    const lastRotation = useRef<ScreenOrientation.Orientation | null>(null);

    useLayoutEffect(() => {
        const subscription = Accelerometer.addListener(({ x, y }) => {
            const radian = Math.atan2(y, x);
            const degree = (radian * 180) / Math.PI;

            let rotation = ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
            if (degree > -135) rotation = ScreenOrientation.Orientation.PORTRAIT_UP;
            if (degree > -45) rotation = ScreenOrientation.Orientation.LANDSCAPE_LEFT;
            if (degree > 45) rotation = ScreenOrientation.Orientation.PORTRAIT_DOWN;
            if (degree > 135) rotation = ScreenOrientation.Orientation.LANDSCAPE_RIGHT;

            if (Platform.OS === 'android') {
                rotation = ScreenOrientation.Orientation.LANDSCAPE_LEFT;
                if (degree > -135) rotation = ScreenOrientation.Orientation.PORTRAIT_DOWN;
                if (degree > -45) rotation = ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
                if (degree > 45) rotation = ScreenOrientation.Orientation.PORTRAIT_UP;
                if (degree > 135) rotation = ScreenOrientation.Orientation.LANDSCAPE_LEFT;
            }

            if (lastRotation.current !== rotation) {
                setOrientation(rotation);
                lastRotation.current = rotation;
            }
        });

        setTimeout(() => {
            Accelerometer.setUpdateInterval(200);
        }, 100);

        return () => subscription.remove();
    }, []);

    return { orientation };
};
