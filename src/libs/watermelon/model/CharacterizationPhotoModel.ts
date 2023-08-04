import { DBTablesEnum } from '@constants/enums/db-tables';
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

class CharacterizationPhotoModel extends Model {
    static table = 'characterization_photos';
    static associations = {
        [DBTablesEnum.COMPANY_CHARACTERIZATION]: { type: 'belongs_to', key: 'companyCharacterizationId' },
    } as const;

    @field('name') name!: string;
    @field('photoUrl') photoUrl!: string;
    @field('companyCharacterizationId') companyCharacterizationId!: string;
    @readonly @field('created_at') created_at?: Date;
    @readonly @field('updated_at') updated_at?: Date;
    @readonly @field('deleted_at') deleted_at?: Date;
}

export { CharacterizationPhotoModel };
