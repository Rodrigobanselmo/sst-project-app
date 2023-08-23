import HistorySvg from '@assets/history.svg';
import HomeSvg from '@assets/home.svg';
import ProfileSvg from '@assets/profile.svg';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Characterization } from '@screens/Characterization';
import { Home } from '@screens/Home';
import { Profile } from '@screens/Profile';
import { WorkspacesEnviroment } from '@screens/WorkspacesEnviroment';
import { AppRoutesProps } from './AppRoutesProps';
import { THEME } from '../../theme/theme';
import { Characterizations } from '@screens/Characterizations';
import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '@libs/watermelon';
import { api } from '@services/api';
import { getSyncChanges } from '@services/api/sync/getSyncChanges';
import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect, useRef } from 'react';

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
    const netInfo = useNetInfo();
    const synchronizing = useRef(false);

    async function offlineSynchronize() {
        try {
            await synchronize({
                database,
                pullChanges: async ({ lastPulledAt }) => {
                    const { changes, latestVersion } = await getSyncChanges({
                        lastPulledVersion: lastPulledAt ? new Date(lastPulledAt) : undefined,
                    });

                    return {
                        changes: changes,
                        timestamp: latestVersion,
                    };
                },
                pushChanges: async ({ changes }) => {},
            });
        } catch (err) {
            console.error(err);
        }
    }

    useEffect(() => {
        const syncChanges = async () => {
            if (netInfo.isConnected && !synchronizing.current) {
                synchronizing.current = true;

                try {
                    await offlineSynchronize();
                } catch (err) {
                    console.log(err);
                } finally {
                    synchronizing.current = false;
                }
            }
        };

        syncChanges();
    }, [netInfo.isConnected]);

    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
            <Stack.Screen name="main" component={BottomRoutes} />
            <Stack.Screen name="characterizations" component={Characterizations} />
            <Stack.Screen name="characterization" component={Characterization} />
        </Stack.Navigator>
    );
};
