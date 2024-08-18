import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { IHierarchy } from './IHierarchy';
import { IRiskData } from './IRiskData';

export type ICharacterization = {
    id: string;
    name: string;
    description?: string;
    created_at: Date;
    deleted_at?: Date;
    done_at?: Date;
    updated_at: Date;
    workspaceId: string;
    type: CharacterizationTypeEnum;
    order: number;
    companyId: string;
    photos: ICharacterizationPhoto[];
    hierarchies?: IHierarchy[];
    noiseValue: string;
    temperature: string;
    moisturePercentage: string;
    luminosity: string;
    activities: string[];
    considerations: string[];
    paragraphs: string[];
    riskData?: IRiskData[];
    profiles: ICharacterization[];
    profileName: string;
    profileParentId: string;
    profileParent: ICharacterization;
};

export type ICharacterizationPhoto = {
    id: string;
    name: string;
    companyCharacterizationId: string;
    photoUrl: string;
    created_at: Date;
    deleted_at?: Date;
    updated_at: Date;
};
