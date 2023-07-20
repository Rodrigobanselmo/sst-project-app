import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'native-base';
import { Home } from '@screens/Home';
import { Profile } from '@screens/Profile';
import { AppRoutesProps } from './AppRoutesProps';
import HistorySvg from '@assets/history.svg';
import HomeSvg from '@assets/home.svg';
import ProfileSvg from '@assets/profile.svg';

const { Navigator, Screen } = createBottomTabNavigator<AppRoutesProps>();

export const AppRoutes = () => {
  const { sizes, colors } = useTheme();
  const iconSize = sizes[6];

  return (
    <Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.green[500],
        tabBarInactiveTintColor: colors.gray[200],
        tabBarStyle: {
          backgroundColor: colors.gray[600],
          borderTopWidth: 0,
          height: Platform.OS === 'android' ? 'auto' : 96,
          paddingBottom: sizes[10],
          paddingTop: sizes[6],
        },
      }}
    >
      <Screen
        name="home"
        component={Home}
        options={{ tabBarIcon: ({ color }) => <HomeSvg fill={color} width={iconSize} height={iconSize} /> }}
      />
      <Screen
        name="history"
        component={Home}
        options={{ tabBarIcon: ({ color }) => <HistorySvg fill={color} width={iconSize} height={iconSize} /> }}
      />
      <Screen
        name="profile"
        component={Profile}
        options={{ tabBarIcon: ({ color }) => <ProfileSvg fill={color} width={iconSize} height={iconSize} /> }}
      />
      <Screen name="exercise" component={Home} options={{ tabBarButton: () => null }} />
    </Navigator>
  );
};
