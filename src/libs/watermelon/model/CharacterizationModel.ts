import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { Model } from '@nozbe/watermelondb';
import { field, date, children, readonly, relation } from '@nozbe/watermelondb/decorators';
import { CharacterizationPhotoModel } from './CharacterizationPhotoModel';

class CharacterizationModel extends Model {
    static table = DBTablesEnum.COMPANY_CHARACTERIZATION;
    static associations = {
        photos: { type: 'has_many', foreignKey: 'companyCharacterizationId' },
        profiles: { type: 'has_many', foreignKey: 'profileParentId' },
        profileParent: { type: 'belongs_to', key: 'profileParentId' },
    } as const;

    @field('name') name!: string;
    @field('type') type!: CharacterizationTypeEnum;
    @field('profileParentId') profileParentId?: string;
    @field('profileName') profileName?: string;
    @field('description') description?: string;
    @field('status') status?: StatusEnum;
    @field('noiseValue') noiseValue?: string;
    @field('temperature') temperature?: string;
    @field('luminosity') luminosity?: string;
    @field('moisturePercentage') moisturePercentage?: string;
    @children(DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO) photos?: CharacterizationPhotoModel[];
    @children(DBTablesEnum.COMPANY_CHARACTERIZATION) profiles?: CharacterizationModel[];
    // @relation(DBTablesEnum.COMPANY_CHARACTERIZATION, 'profileParentId') profileParent?: CharacterizationModel;
    @readonly @field('user_id') userId!: string;
    @readonly @field('created_at') created_at?: Date;
    @readonly @field('updated_at') updated_at?: Date;
    @readonly @field('updated_at') deleted_at?: Date;
}
export { CharacterizationModel };
