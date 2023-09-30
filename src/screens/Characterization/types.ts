import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { RecTypeEnum } from '@constants/enums/risk.enum';
import { RiskDataModel } from '@libs/watermelon/model/RiskDataModel';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppRoutesProps } from '@routes/app/AppRoutesProps';
import { Orientation } from 'expo-screen-orientation';

export interface ICharImageGallery {
    uri: string;
    orientation?: Orientation;
    name?: string;
    id?: string;
}
export interface CharacterizationFormProps {
    workspaceId: string;
    id?: string;
    profileParentId?: string;
    profileName?: string;
    isEdited?: boolean;
    type?: CharacterizationTypeEnum;
    photos?: ICharImageGallery[];
    riskData?: RiskDataFormProps[];
    hierarchies?: { id: string }[];
    employees?: { id: string }[];
    // name?: string;
    // description?: string;
    // noiseValue?: string;
    // temperature?: string;
    // luminosity?: string;
    // moisturePercentage?: string;
}

export type RiskDataFormSelectedProps = {
    name: string;
    id?: string;
    efficientlyCheck?: boolean;
    type?: RecTypeEnum;
    m2mId?: string;
};

export type RiskDataFormRelationsProps = {
    recsToRiskData?: RiskDataFormSelectedProps[];
    admsToRiskData?: RiskDataFormSelectedProps[];
    engsToRiskData?: RiskDataFormSelectedProps[];
    generateSourcesToRiskData?: RiskDataFormSelectedProps[];
    episToRiskData?: RiskDataFormSelectedProps[];
};

export type RiskDataFormRelationsDeletionsProps = {
    [K in keyof RiskDataFormRelationsProps & string as `del_${K}`]?: string[];
};

export type RiskDataFormProps = {
    id?: string;
    probability?: number;
    probabilityAfter?: number;
    riskId: string;
} & RiskDataFormRelationsDeletionsProps &
    RiskDataFormRelationsProps;

export type FormCharacterizationRoutesProps = {
    formCharacterization: Partial<CharacterizationFormProps>;
    formRiskData: RiskDataFormProps;
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
