import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { Model } from '@nozbe/watermelondb';
import { field, date, children, readonly, relation, lazy } from '@nozbe/watermelondb/decorators';
import { CharacterizationPhotoModel } from './CharacterizationPhotoModel';
import { CharacterizationModel } from './CharacterizationModel';
import { CompanyModel } from './CompanyModel';

class WorkspaceModel extends Model {
    static table = DBTablesEnum.WORKSPACE;
    static associations = {
        [DBTablesEnum.COMPANY_CHARACTERIZATION]: { type: 'has_many', foreignKey: 'companyId' },
        [DBTablesEnum.USER_AUTH]: { type: 'belongs_to', key: 'user_id' },
        [DBTablesEnum.COMPANY]: { type: 'belongs_to', key: 'workspaceId' },
    } as const;

    @field('apiId') apiId?: string;
    @field('name') name!: string;
    @field('abbreviation') abbreviation?: string;
    @field('description') description?: string;
    @field('status') status!: StatusEnum;
    @field('withCharacterization') withCharacterization?: boolean;

    @field('cep') cep?: string;
    @field('street') street?: string;
    @field('neighborhood') neighborhood?: string;
    @field('city') city?: string;
    @field('state') state?: string;
    @field('number') number?: string;
    @field('complement') complement?: string;

    @field('companyId') companyId?: string;

    @field('user_id') userId!: string;
    @field('created_at') created_at?: Date;
    @field('updated_at') updated_at?: Date;
    @field('deleted_at') deleted_at?: Date;

    @children(DBTablesEnum.COMPANY_CHARACTERIZATION) characterization?: CharacterizationModel[];
    @relation(DBTablesEnum.COMPANY, 'companyId') Company?: CompanyModel;
}
export { WorkspaceModel };