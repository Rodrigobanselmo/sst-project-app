import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { Model } from '@nozbe/watermelondb';
import { field, date, children, readonly, relation, lazy } from '@nozbe/watermelondb/decorators';
import { CharacterizationPhotoModel } from './CharacterizationPhotoModel';
import { CharacterizationModel } from './CharacterizationModel';
import { CompanyModel } from './CompanyModel';
import { UserAuthModel } from './UserAuthModel';
import { MeasuresTypeEnum, RecTypeEnum } from '@constants/enums/risk.enum';
import { EngsRiskDataModel } from './_MMModel/EngsRiskDataModel';
import { RiskModel } from './RiskModel';
import { AdmsRiskDataModel } from './_MMModel/AdmsRiskDataModel';
import { RecsRiskDataModel } from './_MMModel/RecsRiskDataModel';

class RecMedModel extends Model {
    static table = DBTablesEnum.REC_MED;
    static associations = {
        [DBTablesEnum.MM_ENGS_TO_RISK_DATA]: { type: 'has_many', foreignKey: 'recMedId' },
        [DBTablesEnum.MM_ADMS_TO_RISK_DATA]: { type: 'has_many', foreignKey: 'recMedId' },
        [DBTablesEnum.RISK]: { type: 'belongs_to', key: 'riskId' },
        [DBTablesEnum.USER_AUTH]: { type: 'belongs_to', key: 'user_id' },
    } as const;

    @field('apiId') apiId?: string;
    @field('riskId') riskId!: string;
    @field('companyId') companyId?: string;
    @field('recName') recName?: string;
    @field('medName') medName?: string;
    @field('status') status?: StatusEnum;
    @field('medType') medType?: MeasuresTypeEnum;
    @field('recType') recType?: RecTypeEnum;

    @field('user_id') userId!: string;
    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;

    @children(DBTablesEnum.MM_ENGS_TO_RISK_DATA) engsRiskData?: EngsRiskDataModel[];
    @children(DBTablesEnum.MM_ADMS_TO_RISK_DATA) admsRiskData?: AdmsRiskDataModel[];
    @children(DBTablesEnum.MM_RECS_TO_RISK_DATA) recsRiskData?: RecsRiskDataModel[];

    @relation(DBTablesEnum.USER_AUTH, 'user_id') UserAuth?: UserAuthModel;
    @relation(DBTablesEnum.RISK, 'riskId') Risk?: RiskModel;
}
export { RecMedModel };
