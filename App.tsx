import { GluestackUIProvider } from '@components/core';
import { SLoading } from '@components/index';
import { AuthProvider } from '@contexts/AuthContext';
import { Roboto_400Regular, Roboto_700Bold, useFonts } from '@expo-google-fonts/roboto';
import { Routes } from '@routes/index';
import { isAndroid } from '@utils/helpers/getPlataform';
import * as NavigationBar from 'expo-navigation-bar';
import { LogBox, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { config } from './gluestack-ui.config';

LogBox.ignoreLogs([
    'In React 18, SSRProvider is not necessary and is a noop. You can remove it from your app.',
    `Constants.platform.ios.model has been deprecated in favor of expo-device's Device.modelName property. This API will be removed in SDK 45.`,
    "Module PhotoEditor requires main queue setup since it overrides `init` but doesn't implement `requiresMainQueueSetup`. In a future release React Native will default to initializing all native modules on a background thread unless explicitly opted-out of.",
]);

export default function App() {
    const [fontsLoaded] = useFonts({
        Roboto_400Regular,
        Roboto_700Bold,
    });

    if (isAndroid()) {
        NavigationBar.setBackgroundColorAsync('white');
        NavigationBar.setButtonStyleAsync('dark');
    }

    return (
        <GluestackUIProvider config={config.theme}>
            <SafeAreaProvider>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
                <AuthProvider>{fontsLoaded ? <Routes /> : <SLoading />}</AuthProvider>
            </SafeAreaProvider>
        </GluestackUIProvider>
    );
}
