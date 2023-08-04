import { Box } from 'native-base';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { AuthRoutes } from './auth/auth.routes';
import { useAuth } from '@hooks/useAuth';
import { AppRoutes } from './app/app.routes';
import { SLoading } from '@components/index';
import { config } from 'gluestack-ui.config';

export const Routes = () => {
    const { user, isLoadingUserStorageData } = useAuth();

    const theme = DefaultTheme;
    theme.colors.background = config.theme.tokens.colors.backgroundDefault;

    if (isLoadingUserStorageData) {
        return <SLoading />;
    }

    return (
        <Box flex={1} bg="$backgroundDefault">
            <NavigationContainer theme={theme}>{user.id ? <AppRoutes /> : <AuthRoutes />}</NavigationContainer>
        </Box>
    );
};
