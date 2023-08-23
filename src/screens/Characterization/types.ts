import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppRoutesProps } from '@routes/app/AppRoutesProps';
import { Orientation } from 'expo-screen-orientation';

export interface ICharImageGallery {
    uri: string;
    orientation: Orientation;
    name?: string;
    id?: string;
}
export interface CharacterizationFormProps {
    workspaceId: string;
    id?: string;
    photos?: ICharImageGallery[];
    beforePhotos?: ICharImageGallery[];
    isEdited?: boolean;
    // name?: string;
    // description?: string;
    // type?: CharacterizationTypeEnum;
    // noiseValue?: string;
    // temperature?: string;
    // luminosity?: string;
    // moisturePercentage?: string;
}

export type FormCharacterizationRoutesProps = {
    formCharacterization: CharacterizationFormProps;
    cameraCharacterization: undefined;
};

export type CharacterizationPageProps = NativeStackScreenProps<
    AppRoutesProps & FormCharacterizationRoutesProps,
    'characterization'
>;

export type FormCharacterizationScreenProps = {
    route: any;
    navigation: any;
};
