import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { Model, Q } from '@nozbe/watermelondb';
import { field, date, children, readonly, relation, lazy } from '@nozbe/watermelondb/decorators';
import { CharacterizationPhotoModel } from './CharacterizationPhotoModel';
import { CharacterizationModel } from './CharacterizationModel';
import { CompanyModel } from './CompanyModel';
import { WorkspaceHierarchyModel } from './_MMModel/WorkspaceHierarchyModel';

class WorkspaceModel extends Model {
    static table = DBTablesEnum.WORKSPACE;
    static associations = {
        [DBTablesEnum.COMPANY_CHARACTERIZATION]: { type: 'has_many', foreignKey: 'workspaceId' },
        [DBTablesEnum.MM_WOKSPACE_HIERARCHY]: { type: 'has_many', foreignKey: 'workspaceId' },
        [DBTablesEnum.USER_AUTH]: { type: 'belongs_to', key: 'user_id' },
        [DBTablesEnum.COMPANY]: { type: 'belongs_to', key: 'companyId' },
    } as const;

    @field('apiId') apiId?: string;
    @field('name') name!: string;
    @field('abbreviation') abbreviation?: string;
    @field('description') description?: string;
    @field('status') status!: StatusEnum;

    @date('startChar_at') startChar_at?: Date;
    @date('lastSendApiCharacterization_at') lastSendApiCharacterization_at?: Date;

    @field('cep') cep?: string;
    @field('street') street?: string;
    @field('neighborhood') neighborhood?: string;
    @field('city') city?: string;
    @field('state') state?: string;
    @field('number') number?: string;
    @field('complement') complement?: string;

    @field('companyId') companyId!: string;

    @field('user_id') userId!: string;
    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;

    @relation(DBTablesEnum.COMPANY, 'companyId') Company?: CompanyModel;

    @children(DBTablesEnum.COMPANY_CHARACTERIZATION) characterization?: CharacterizationModel[];
    @children(DBTablesEnum.MM_WOKSPACE_HIERARCHY) workspaceToHierarchy?: WorkspaceHierarchyModel[];

    @lazy
    characterizationsList = this.collections
        .get(DBTablesEnum.COMPANY_CHARACTERIZATION)
        .query(Q.where('workspaceId', this.id), Q.where('profileParentId', Q.eq(null)));

    @lazy
    hierarchies = this.collections
        .get(DBTablesEnum.HIERARCHY)
        .query(Q.on(DBTablesEnum.MM_WOKSPACE_HIERARCHY, 'workspaceId', this.id));
}
export { WorkspaceModel };
