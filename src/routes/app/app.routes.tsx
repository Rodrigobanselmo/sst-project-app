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
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<AppRoutesProps>();
const Bottom = createBottomTabNavigator<AppRoutesProps>();

export const BottomRoutes = () => {
    const { sizes, colors } = useTheme();
    const iconSize = sizes[6];

    return (
        <Bottom.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary.main,
                tabBarShowLabel: false,
            }}
        >
            <Bottom.Screen
                name="home"
                component={Home}
                options={{
                    tabBarLabel: 'Início',
                    tabBarIcon: ({ color }) => <HomeSvg fill={color} width={iconSize} height={iconSize} />,
                }}
            />
            <Bottom.Screen
                name="task"
                component={Task}
                options={({ route }) => {
                    console.log(route);
                    return {
                        tabBarVisible: route.path == 'task' ? true : false,
                        tabBarLabel: 'Atividade',
                        tabBarIcon: ({ color }) => <HistorySvg fill={color} width={iconSize} height={iconSize} />,
                    };
                }}
            />
            <Bottom.Screen
                name="profile"
                component={Profile}
                options={{
                    tabBarLabel: 'Perfil',
                    tabBarIcon: ({ color }) => <ProfileSvg fill={color} width={iconSize} height={iconSize} />,
                }}
            />
            {/* <Screen name="characterization" component={Characterization} options={{ tabBarButton: () => null }} />
            <Screen
                name="camera"
                component={CameraPage}
                options={{
                    tabBarButton: () => null,
                    tabBarStyle: {
                        display: 'none',
                        height: 0,
                    },
                }}
            /> */}
            {/* <Screen
                name="camera"
                component={CameraPage}
                options={{
                    tabBarIcon: () => null,
                    tabBarStyle: {
                        display: 'none',
                        height: 0,
                    },
                }}
            /> */}
        </Bottom.Navigator>
    );
};

export const AppRoutes = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
            <Stack.Screen name="main" component={BottomRoutes} />
            <Stack.Screen name="characterization" component={Characterization} />
            <Stack.Screen name="camera" component={CameraPage} />
        </Stack.Navigator>
    );
};
