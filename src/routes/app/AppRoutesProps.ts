import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CharParamsProps } from '@screens/Characterization/types';

export type AppRoutesProps = {
    main: undefined;
    home: undefined;
    task: undefined;
    profile: undefined;
    camera: undefined;
    characterization: CharParamsProps;
};

export type AppNavigatorRoutesProps = BottomTabNavigationProp<AppRoutesProps>;
