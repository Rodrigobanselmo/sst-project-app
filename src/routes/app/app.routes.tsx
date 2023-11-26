import HistorySvg from '@assets/history.svg';
import ProfileSvg from '@assets/profile.svg';
import { useSync } from '@hooks/useSync';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Characterization } from '@screens/Characterization';
import { Characterizations } from '@screens/Characterizations';
import { Profile } from '@screens/Profile';
import { Test } from '@screens/Test';
import { WorkspacesEnviroment } from '@screens/WorkspacesEnviroment';
import { useEffect } from 'react';
import { THEME } from '../../theme/theme';
import { AppRoutesProps } from './AppRoutesProps';

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

                //hide
                tabBarStyle: {
                    backgroundColor: 'transparent',
                    elevation: 0,
                    borderTopWidth: 0,
                    height: 0,
                    margin: 0,
                    padding: 0,
                    pointerEvents: 'none',
                    opacity: 0,
                },
            }}
        >
            {/* <Bottom.Screen
                name="home"
                component={Home}
                options={{
                    tabBarLabel: 'Início',
                    tabBarIcon: ({ color }) => <HomeSvg fill={color} width={iconSize} height={iconSize} />,
                }}
            /> */}
            <Bottom.Screen
                name="workspacesEnviroment"
                component={WorkspacesEnviroment}
                options={({ route }) => {
                    return {
                        tabBarLabel: 'Caracterização Ambiente',
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
    const { syncChanges } = useSync();

    useEffect(() => {
        syncChanges();
    }, [syncChanges]);

    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
            <Stack.Screen name={'test' as unknown as any} component={Test} />
            <Stack.Screen name="main" component={BottomRoutes} />
            <Stack.Screen name="characterizations" component={Characterizations} />
            <Stack.Screen name="characterization" component={Characterization} />
        </Stack.Navigator>
    );
};
