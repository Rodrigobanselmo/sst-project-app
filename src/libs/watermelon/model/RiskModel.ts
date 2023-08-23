import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { Model } from '@nozbe/watermelondb';
import { field, date, children, readonly, relation, lazy } from '@nozbe/watermelondb/decorators';
import { CharacterizationPhotoModel } from './CharacterizationPhotoModel';
import { CharacterizationModel } from './CharacterizationModel';
import { CompanyModel } from './CompanyModel';
import { UserAuthModel } from './UserAuthModel';
import { RecMedModel } from './RecMedModel';
import { GenerateSourceModel } from './GenerateSourceModel';
import { RiskDataModel } from './RiskDataModel';
import { RiskEnum } from '@constants/enums/risk.enum';

class RiskModel extends Model {
    static table = DBTablesEnum.RISK;
    static associations = {
        [DBTablesEnum.USER_AUTH]: { type: 'belongs_to', key: 'user_id' },
        [DBTablesEnum.COMPANY]: { type: 'belongs_to', key: 'companyId' },
        [DBTablesEnum.REC_MED]: { type: 'has_many', foreignKey: 'riskId' },
        [DBTablesEnum.GENERATE_SOURCE]: { type: 'has_many', foreignKey: 'riskId' },
        [DBTablesEnum.RISK_DATA]: { type: 'has_many', foreignKey: 'riskId' },
    } as const;

    @field('apiId') apiId?: string;
    @field('name') name!: string;
    @field('severity') severity!: number;
    @field('status') status!: StatusEnum;
    @field('type') type!: RiskEnum;
    @field('companyId') companyId?: string;
    @field('representAll') representAll?: boolean;
    @field('cas') cas?: string;

    @field('user_id') userId!: string;
    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;

    @children(DBTablesEnum.REC_MED) recMed?: RecMedModel[];
    @children(DBTablesEnum.GENERATE_SOURCE) generateSource?: GenerateSourceModel[];
    @children(DBTablesEnum.RISK_DATA) riskFactorData?: RiskDataModel[];

    @relation(DBTablesEnum.COMPANY, 'companyId') Company?: CompanyModel;
    @relation(DBTablesEnum.USER_AUTH, 'user_id') UserAuth?: UserAuthModel;
}
export { RiskModel };
