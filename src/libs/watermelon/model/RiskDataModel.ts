import { DBTablesEnum } from '@constants/enums/db-tables';
import { Model, Q } from '@nozbe/watermelondb';
import { children, date, field, lazy, relation } from '@nozbe/watermelondb/decorators';
import { CharacterizationModel } from './CharacterizationModel';
import { RiskModel } from './RiskModel';
import { UserAuthModel } from './UserAuthModel';
import { AdmsRiskDataModel } from './_MMModel/AdmsRiskDataModel';
import { EngsRiskDataModel } from './_MMModel/EngsRiskDataModel';
import { EpisRiskDataModel } from './_MMModel/EpisRiskDataModel';
import { GenerateRiskDataModel } from './_MMModel/GenerateRiskDataModel';
import { RecsRiskDataModel } from './_MMModel/RecsRiskDataModel';

export type IRiskDataActivities = {
    activities: { description: string; subActivity?: string }[];
    realActivity?: string;
};
class RiskDataModel extends Model {
    static table = DBTablesEnum.RISK_DATA;
    static associations = {
        [DBTablesEnum.RISK]: { type: 'belongs_to', key: 'riskId' },
        [DBTablesEnum.USER_AUTH]: { type: 'belongs_to', key: 'user_id' },
        [DBTablesEnum.COMPANY_CHARACTERIZATION]: { type: 'belongs_to', key: 'riskId' },

        [DBTablesEnum.MM_ADMS_TO_RISK_DATA]: { type: 'has_many', foreignKey: 'riskDataId' },
        [DBTablesEnum.MM_ENGS_TO_RISK_DATA]: { type: 'has_many', foreignKey: 'riskDataId' },
        [DBTablesEnum.MM_GENERATE_TO_RISK_DATA]: { type: 'has_many', foreignKey: 'riskDataId' },
        [DBTablesEnum.MM_EPIS_TO_RISK_DATA]: { type: 'has_many', foreignKey: 'riskDataId' },
        [DBTablesEnum.MM_RECS_TO_RISK_DATA]: { type: 'has_many', foreignKey: 'riskDataId' },
    } as const;

    @field('apiId') apiId?: string;
    @field('riskId') riskId!: string;
    @field('probability') probability?: number;
    @field('probabilityAfter') probabilityAfter?: number;
    @field('characterizationId') characterizationId?: string;
    @field('activities') activities?: string;
    @field('exposure') exposure?: string;

    @field('user_id') userId!: string;
    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;

    @children(DBTablesEnum.MM_RECS_TO_RISK_DATA) recsToRiskData?: RecsRiskDataModel[];
    @children(DBTablesEnum.MM_ADMS_TO_RISK_DATA) admsToRiskData?: AdmsRiskDataModel[];
    @children(DBTablesEnum.MM_ENGS_TO_RISK_DATA) engsToRiskData?: EngsRiskDataModel[];
    @children(DBTablesEnum.MM_GENERATE_TO_RISK_DATA) generateSourcesToRiskData?: GenerateRiskDataModel[];
    @children(DBTablesEnum.MM_EPIS_TO_RISK_DATA) episToRiskData?: EpisRiskDataModel[];

    @relation(DBTablesEnum.USER_AUTH, 'user_id') UserAuth?: UserAuthModel;
    @relation(DBTablesEnum.RISK, 'riskId') Risk?: RiskModel;
    @relation(DBTablesEnum.COMPANY_CHARACTERIZATION, 'characterizationId')
    CompanyCharacterization?: CharacterizationModel;

    @lazy
    adms = this.collections
        .get(DBTablesEnum.REC_MED)
        .query(Q.on(DBTablesEnum.MM_ADMS_TO_RISK_DATA, 'riskDataId', this.id));

    @lazy
    engs = this.collections
        .get(DBTablesEnum.REC_MED)
        .query(Q.on(DBTablesEnum.MM_ENGS_TO_RISK_DATA, 'riskDataId', this.id));

    @lazy
    recs = this.collections
        .get(DBTablesEnum.REC_MED)
        .query(Q.on(DBTablesEnum.MM_RECS_TO_RISK_DATA, 'riskDataId', this.id));

    @lazy
    generateSources = this.collections
        .get(DBTablesEnum.GENERATE_SOURCE)
        .query(Q.on(DBTablesEnum.MM_GENERATE_TO_RISK_DATA, 'riskDataId', this.id));
}
export { RiskDataModel };
