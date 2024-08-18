import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { Model, Q } from '@nozbe/watermelondb';
import { field, date, children, readonly, relation, lazy } from '@nozbe/watermelondb/decorators';
import { CharacterizationPhotoModel } from './CharacterizationPhotoModel';
import { CompanyModel } from './CompanyModel';
import { WorkspaceModel } from './WorkspaceModel';
import { UserAuthModel } from './UserAuthModel';
import { RiskDataModel } from './RiskDataModel';
import { CharacterizationHierarchyModel } from './_MMModel/CharacterizationHierarchyModel';
import { CharacterizationEmployeeModel } from './_MMModel/CharacterizationEmployeeModel';

class CharacterizationModel extends Model {
    static table = DBTablesEnum.COMPANY_CHARACTERIZATION;
    static associations = {
        [DBTablesEnum.USER_AUTH]: { type: 'belongs_to', key: 'user_id' },
        [DBTablesEnum.COMPANY]: { type: 'belongs_to', key: 'companyId' },
        [DBTablesEnum.WORKSPACE]: { type: 'belongs_to', key: 'workspaceId' },

        [DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO]: { type: 'has_many', foreignKey: 'companyCharacterizationId' },
        [DBTablesEnum.RISK_DATA]: { type: 'has_many', foreignKey: 'characterizationId' },
        [DBTablesEnum.MM_CHARACTERIZATION_HIERARCHY]: { type: 'has_many', foreignKey: 'characterizationId' },
        [DBTablesEnum.MM_CHARACTERIZATION_EMPLOYEE]: { type: 'has_many', foreignKey: 'characterizationId' },

        // profiles: { type: 'has_many', foreignKey: 'profileParentId' },
        // profileParent: { type: 'belongs_to', key: 'profileParentId' },
    } as const;

    @field('apiId') apiId?: string;
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
    @field('audios') audios?: string;
    @field('videos') videos?: string;

    @field('workspaceId') workspaceId!: string;
    @field('companyId') companyId?: string;

    @field('user_id') userId!: string;
    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;
    @date('done_at') done_at?: Date | null;

    @relation(DBTablesEnum.USER_AUTH, 'user_id') UserAuth?: UserAuthModel;
    @relation(DBTablesEnum.COMPANY, 'companyId') Company?: CompanyModel;
    @relation(DBTablesEnum.WORKSPACE, 'workspaceId') Workspace?: WorkspaceModel;

    @children(DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO) photos?: CharacterizationPhotoModel[];
    @children(DBTablesEnum.RISK_DATA) riskData?: RiskDataModel[];

    @children(DBTablesEnum.MM_CHARACTERIZATION_HIERARCHY)
    characterizationToHierarchy?: CharacterizationHierarchyModel[];

    @children(DBTablesEnum.MM_CHARACTERIZATION_EMPLOYEE)
    characterizationToEmployee?: CharacterizationEmployeeModel[];

    @lazy
    hierarchies = this.collections
        .get(DBTablesEnum.HIERARCHY)
        .query(Q.on(DBTablesEnum.MM_CHARACTERIZATION_HIERARCHY, 'characterizationId', this.id));

    @lazy
    employees = this.collections
        .get(DBTablesEnum.EMPLOYEE)
        .query(Q.on(DBTablesEnum.MM_CHARACTERIZATION_EMPLOYEE, 'characterizationId', this.id));

    // @children(DBTablesEnum.COMPANY_CHARACTERIZATION) profiles?: CharacterizationModel[];
    // @relation(DBTablesEnum.COMPANY_CHARACTERIZATION, 'profileParentId') profileParent?: CharacterizationModel;

    // @lazy photoss = this.collections
    //     .get(DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO)
    //     .query(Q.on(DBTablesEnum.COMPANY_CHARACTERIZATION, 'post_id', this.id));
}
export { CharacterizationModel };
