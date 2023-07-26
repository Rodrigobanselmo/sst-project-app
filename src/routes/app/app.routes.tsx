import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Box, Center, useTheme } from 'native-base';
import { Home } from '@screens/Home';
import { Profile } from '@screens/Profile';
import { AppRoutesProps } from './AppRoutesProps';
import HistorySvg from '@assets/history.svg';
import HomeSvg from '@assets/home.svg';
import ProfileSvg from '@assets/profile.svg';
import { Task } from '@screens/Task';
import { Characterization } from '@screens/Characterization';
import { CameraPage } from '@screens/Camera';

const { Navigator, Screen } = createBottomTabNavigator<AppRoutesProps>();

export const AppRoutes = () => {
    const { sizes, colors } = useTheme();
    const iconSize = sizes[6];

    return (
        <Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary.main,
                tabBarShowLabel: false,
            }}
        >
            <Screen
                name="home"
                component={Home}
                options={{
                    tabBarLabel: 'Início',
                    tabBarIcon: ({ color }) => <HomeSvg fill={color} width={iconSize} height={iconSize} />,
                }}
            />
            <Screen
                name="task"
                component={Task}
                options={{
                    tabBarLabel: 'Atividade',
                    tabBarIcon: ({ color }) => <HistorySvg fill={color} width={iconSize} height={iconSize} />,
                }}
            />
            <Screen
                name="profile"
                component={Profile}
                options={{
                    tabBarLabel: 'Perfil',
                    tabBarIcon: ({ color }) => <ProfileSvg fill={color} width={iconSize} height={iconSize} />,
                }}
            />
            <Screen name="characterization" component={Characterization} options={{ tabBarButton: () => null }} />
            <Screen
                name="camera"
                component={CameraPage}
                options={{
                    tabBarStyle: {
                        display: 'none',
                        height: 0,
                    },
                }}
            />
        </Navigator>
    );
};
