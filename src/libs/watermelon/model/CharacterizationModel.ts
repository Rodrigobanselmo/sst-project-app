import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { Model } from '@nozbe/watermelondb';
import { field, date, children, readonly, relation, lazy } from '@nozbe/watermelondb/decorators';
import { CharacterizationPhotoModel } from './CharacterizationPhotoModel';
import { CompanyModel } from './CompanyModel';
import { WorkspaceModel } from './WorkspaceModel';
import { UserAuthModel } from './UserAuthModel';
import { RiskDataModel } from './RiskDataModel';

class CharacterizationModel extends Model {
    static table = DBTablesEnum.COMPANY_CHARACTERIZATION;
    static associations = {
        [DBTablesEnum.USER_AUTH]: { type: 'belongs_to', key: 'user_id' },
        [DBTablesEnum.COMPANY]: { type: 'belongs_to', key: 'companyId' },
        [DBTablesEnum.WORKSPACE]: { type: 'belongs_to', key: 'workspaceId' },

        [DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO]: { type: 'has_many', foreignKey: 'companyCharacterizationId' },
        [DBTablesEnum.RISK_DATA]: { type: 'has_many', foreignKey: 'characterizationId' },
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

    @field('workspaceId') workspaceId!: string;
    @field('companyId') companyId?: string;

    @field('user_id') userId!: string;
    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;

    @relation(DBTablesEnum.USER_AUTH, 'user_id') UserAuth?: UserAuthModel;
    @relation(DBTablesEnum.COMPANY, 'companyId') Company?: CompanyModel;
    @relation(DBTablesEnum.WORKSPACE, 'workspaceId') Workspace?: WorkspaceModel;

    @children(DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO) photos?: CharacterizationPhotoModel[];
    @children(DBTablesEnum.RISK_DATA) riskData?: RiskDataModel[];

    // @children(DBTablesEnum.COMPANY_CHARACTERIZATION) profiles?: CharacterizationModel[];
    // @relation(DBTablesEnum.COMPANY_CHARACTERIZATION, 'profileParentId') profileParent?: CharacterizationModel;

    // @lazy photoss = this.collections
    //     .get(DBTablesEnum.COMPANY_CHARACTERIZATION_PHOTO)
    //     .query(Q.on(DBTablesEnum.COMPANY_CHARACTERIZATION, 'post_id', this.id));
}
export { CharacterizationModel };
