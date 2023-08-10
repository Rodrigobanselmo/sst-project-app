import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { AuthRoutes } from './auth/auth.routes';
import { useAuth } from '@hooks/useAuth';
import { AppRoutes } from './app/app.routes';
import { SLoading } from '@components/index';
import { SBox } from '@components/core';
import { THEME } from '../theme/theme';

export const Routes = () => {
    const { user, isLoadingUserStorageData } = useAuth();

    const theme = DefaultTheme;
    theme.colors.background = THEME.colors.background.default;

    if (isLoadingUserStorageData) {
        return <SLoading />;
    }

    return (
        <SBox flex={1} bg="background.default">
            <NavigationContainer theme={theme}>{user.id ? <AppRoutes /> : <AuthRoutes />}</NavigationContainer>
        </SBox>
    );
};
