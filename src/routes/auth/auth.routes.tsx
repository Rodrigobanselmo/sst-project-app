import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthRoutesProps } from './AuthRoutesProps';
import { SignUp } from '@screens/SignUp';
import { SignIn } from '@screens/SignIn';

const { Navigator, Screen } = createNativeStackNavigator<AuthRoutesProps>();

export const AuthRoutes = () => {
    return (
        <Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
            <Screen name="signIn" component={SignIn} />
            <Screen name="signUp" component={SignUp} />
        </Navigator>
    );
};
