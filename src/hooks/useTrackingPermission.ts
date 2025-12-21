import { useEffect, useState } from 'react';
import * as TrackingTransparency from 'expo-tracking-transparency';
import { Platform } from 'react-native';

/**
 * Hook to request App Tracking Transparency permission on iOS
 * This is required by Apple's App Store guidelines when collecting user data
 * for tracking purposes (email, user ID, device ID, crash data, etc.)
 */
export function useTrackingPermission() {
    const [trackingStatus, setTrackingStatus] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            // Only request on iOS
            if (Platform.OS !== 'ios') {
                return;
            }

            try {
                // Get current tracking permission status
                const { status } = await TrackingTransparency.getTrackingPermissionsAsync();
                setTrackingStatus(status);

                // If not determined yet, request permission
                if (status === 'undetermined') {
                    const { status: newStatus } = await TrackingTransparency.requestTrackingPermissionsAsync();
                    setTrackingStatus(newStatus);
                }
            } catch (error) {
                console.error('Error requesting tracking permission:', error);
            }
        })();
    }, []);

    return { trackingStatus };
}

