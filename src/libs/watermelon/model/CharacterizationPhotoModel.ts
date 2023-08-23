import { DBTablesEnum } from '@constants/enums/db-tables';
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import { CharacterizationModel } from './CharacterizationModel';

class CharacterizationPhotoModel extends Model {
    static table = DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO;
    static associations = {
        [DBTablesEnum.COMPANY_CHARACTERIZATION]: { type: 'belongs_to', key: 'companyCharacterizationId' },
    } as const;

    @field('apiId') apiId?: string;
    @field('name') name!: string;
    @field('photoUrl') photoUrl!: string;
    @field('companyCharacterizationId') companyCharacterizationId!: string;
    @field('created_at') created_at?: Date;
    @field('updated_at') updated_at?: Date;
    @field('deleted_at') deleted_at?: Date;

    @relation(DBTablesEnum.COMPANY_CHARACTERIZATION, 'companyCharacterizationId')
    CompanyCharacterization!: CharacterizationModel;
}

export { CharacterizationPhotoModel };
