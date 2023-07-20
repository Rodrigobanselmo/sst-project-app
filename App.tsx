import { LogBox, StatusBar } from 'react-native';
import { useFonts, Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { NativeBaseProvider } from 'native-base';
import { Loading } from '@components/Loading';
import { Routes } from '@routes/index';
import { AuthProvider } from '@contexts/AuthContext';
import { THEME } from './src/theme/theme'
import * as NavigationBar from 'expo-navigation-bar';
import { isAndroid } from '@utils/helpers/plataform';

LogBox.ignoreLogs([
  'In React 18, SSRProvider is not necessary and is a noop. You can remove it from your app.',
  `Constants.platform.ios.model has been deprecated in favor of expo-device's Device.modelName property. This API will be removed in SDK 45.`,
])

export default function App() {
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
  });

  if (isAndroid()) {
    NavigationBar.setBackgroundColorAsync("white");
    NavigationBar.setButtonStyleAsync("dark");
  }

  return (
    <NativeBaseProvider theme={THEME}>
      <AuthProvider>{fontsLoaded ? <Routes /> : <Loading />}</AuthProvider>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
    </NativeBaseProvider>
  );
}
