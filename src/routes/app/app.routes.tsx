import HistorySvg from '@assets/history.svg';
import HomeSvg from '@assets/home.svg';
import ProfileSvg from '@assets/profile.svg';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Characterization } from '@screens/Characterization';
import { Home } from '@screens/Home';
import { Profile } from '@screens/Profile';
import { Task } from '@screens/Task';
import { AppRoutesProps } from './AppRoutesProps';
import { THEME } from '../../theme/theme';

const Stack = createNativeStackNavigator<AppRoutesProps>();
const Bottom = createBottomTabNavigator<AppRoutesProps>();

export const BottomRoutes = () => {
    const iconSize = 24;
    const primaryMain = THEME.colors.primary.main;

    return (
        <Bottom.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: primaryMain,
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
        </Bottom.Navigator>
    );
};

export const AppRoutes = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
            <Stack.Screen name="main" component={BottomRoutes} />
            <Stack.Screen name="characterization" component={Characterization} />
        </Stack.Navigator>
    );
};
