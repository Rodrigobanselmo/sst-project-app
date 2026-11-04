import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { RecTypeEnum } from '@constants/enums/risk.enum';
import { RiskDataModel } from '@libs/watermelon/model/RiskDataModel';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { IFileCharacterization } from '@repositories/characterizationRepository';
import { AppRoutesProps } from '@routes/app/AppRoutesProps';
import { Orientation } from 'expo-screen-orientation';
import type { EpiAnswers } from '@libs/sync/epiAnswers';

export interface CharacterizationImageGalleryProps {
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
    photos?: CharacterizationImageGalleryProps[];
    riskData?: RiskDataFormProps[];
    hierarchies?: { id: string }[];
    employees?: { id: string }[];
    audios?: IFileCharacterization[];
    videos?: IFileCharacterization[];
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
    description?: string;
    efficientlyCheck?: boolean;
    type?: RecTypeEnum;
    m2mId?: string;
};
export type RiskDataFormActivitySelectedProps = { description: string; subActivity?: string };
export type RiskDataFormEpiSelectedProps = RiskDataFormSelectedProps & Omit<EpiAnswers, 'efficientlyCheck'>;

export type RiskDataFormRelationsProps = {
    activities?: RiskDataFormSelectedProps[];
    recsToRiskData?: RiskDataFormSelectedProps[];
    admsToRiskData?: RiskDataFormSelectedProps[];
    engsToRiskData?: RiskDataFormSelectedProps[];
    generateSourcesToRiskData?: RiskDataFormSelectedProps[];
    episToRiskData?: RiskDataFormEpiSelectedProps[];
};

export type RiskDataFormRelationsDeletionsProps = {
    [K in keyof RiskDataFormRelationsProps & string as `del_${K}`]?: string[];
};

export type RiskDataFormProps = {
    /** Read-only metadata of this assessment; never sent by the sync planner. */
    catalogRisk?: import('@libs/sync/assessmentCatalog').AssessmentCatalogRisk;
    id?: string;
    realActivity?: string;
    exposure?: string;
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

export type RiskFactorActivities = {
    description: string;
    subActivities?: {
        description: string;
    }[];
};
