import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CharacterizationFormProps } from '@screens/Characterization/types';

export type AppRoutesProps = {
    main: undefined;
    home: undefined;
    task: undefined;
    profile: undefined;
    characterization: CharacterizationFormProps;
};

export type AppNavigatorRoutesProps = BottomTabNavigationProp<AppRoutesProps>;
