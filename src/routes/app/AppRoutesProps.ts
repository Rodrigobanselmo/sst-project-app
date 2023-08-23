import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CharacterizationFormProps } from '@screens/Characterization/types';
import { CharacterizationsProps } from '@screens/Characterizations/types';

export type AppRoutesProps = {
    main: undefined;
    home: undefined;
    // task: undefined;
    workspacesEnviroment: undefined;
    profile: undefined;
    characterization: CharacterizationFormProps;
    characterizations: CharacterizationsProps;
};

export type AppNavigatorRoutesProps = BottomTabNavigationProp<AppRoutesProps>;
