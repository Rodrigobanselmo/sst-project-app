import { Realm } from '@realm/react';
import { GenerateCharacterizationPhotoProps } from './CompanyCharacterizationPhoto';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';

type GenerateCharacterizationProps = {
    id?: string;
    user_id: string;
    name: string;
    type: CharacterizationTypeEnum;

    profileParentId?: string;
    profileName?: string;
    description?: string;
    status?: StatusEnum;

    noiseValue?: string;
    temperature?: string;
    luminosity?: string;
    moisturePercentage?: string;

    photos?: GenerateCharacterizationPhotoProps[];
    profiles?: GenerateCharacterizationProps[];
    profileParent?: GenerateCharacterizationProps;
};

export class CompanyCharacterization extends Realm.Object<CompanyCharacterization> {
    id!: string;
    user_id!: string;
    name!: string;
    type!: CharacterizationTypeEnum;

    profileParentId?: string;
    profileName?: string;
    description?: string;
    status?: StatusEnum;

    noiseValue?: string;
    temperature?: string;
    luminosity?: string;
    moisturePercentage?: string;

    deleted_at?: Date;
    created_at?: Date;
    updated_at?: Date;

    photos?: GenerateCharacterizationPhotoProps[];
    profiles?: GenerateCharacterizationProps[];
    profileParent?: GenerateCharacterizationProps;

    static generate(data: GenerateCharacterizationProps) {
        return {
            id: new Realm.BSON.UUID(),
            status: StatusEnum.ACTIVE,
            created_at: new Date(),
            updated_at: new Date(),
            ...data,
        };
    }

    static schema: Realm.ObjectSchema = {
        name: DBTablesEnum.COMPANY_CHARACTERIZATION,
        primaryKey: 'id',
        properties: {
            id: 'string',
            name: 'string',
            type: 'string',
            created_at: 'date',
            updated_at: 'date?',
            deleted_at: 'date?',
            user_id: {
                type: 'string',
                indexed: true,
            },

            status: 'string',
            description: 'string?',
            profileName: 'string?',
            profileParentId: 'string?',

            luminosity: 'string?',
            moisturePercentage: 'string?',
            noiseValue: 'string?',
            temperature: 'string?',

            photos: `${DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO}[]`,
            profiles: `${DBTablesEnum.COMPANY_CHARACTERIZATION}[]`,
            profileParent: `${DBTablesEnum.COMPANY_CHARACTERIZATION}?`,
            // paragraphs: 'string[]',
            // deleted_at: 'date?',
            // workspaceId: 'string',
            // companyId: 'string',
            // considerations: 'string[]',
            // order: 'int?',
            // activities: 'string[]',
        },
    };
}
