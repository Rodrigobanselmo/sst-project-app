import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export type AppRoutesProps = {
    main: undefined;
    home: undefined;
    task: undefined;
    profile: undefined;
    camera: undefined;
    characterization: {
        id?: number;
    };
};

export type AppNavigatorRoutesProps = BottomTabNavigationProp<AppRoutesProps>;
