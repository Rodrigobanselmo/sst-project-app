import { DBTablesEnum } from '@constants/enums/db-tables';
import { Realm } from '@realm/react';

export type GenerateCharacterizationPhotoProps = {
    id?: string;
    name: string;
    photoUrl: string;
    companyCharacterizationId: string;
    deleted_at?: Date;
    updated_at?: Date;
    created_at?: Date;
    // order: number;
    // isVertical: boolean;
};

export class CompanyCharacterizationPhoto extends Realm.Object<CompanyCharacterizationPhoto> {
    id!: string;
    name!: string;
    photoUrl!: string;
    companyCharacterizationId!: string;
    deleted_at?: Date;
    updated_at?: Date;
    created_at?: Date;

    static generate(data: GenerateCharacterizationPhotoProps) {
        return {
            id: new Realm.BSON.UUID(),
            created_at: new Date(),
            updated_at: new Date(),
            ...data,
        };
    }

    static schema = {
        name: DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO,
        primaryKey: 'id',
        properties: {
            id: 'string',
            name: 'string',
            photoUrl: 'string',
            companyCharacterizationId: 'string',
            created_at: 'date',
            updated_at: 'date?',
            deleted_at: 'date?',
        },
    };
}
