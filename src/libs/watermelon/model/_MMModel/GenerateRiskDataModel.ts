import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { Model } from '@nozbe/watermelondb';
import { field, date, children, readonly, relation, lazy, immutableRelation } from '@nozbe/watermelondb/decorators';
import { CharacterizationPhotoModel } from '../CharacterizationPhotoModel';
import { CharacterizationModel } from '../CharacterizationModel';
import { CompanyModel } from '../CompanyModel';
import { UserAuthModel } from '../UserAuthModel';
import { RiskDataModel } from '../RiskDataModel';
import { RecMedModel } from '../RecMedModel';
import { GenerateSourceModel } from '../GenerateSourceModel';

class GenerateRiskDataModel extends Model {
    static table = DBTablesEnum.MM_ENGS_TO_RISK_DATA;
    static associations = {
        [DBTablesEnum.USER_AUTH]: { type: 'belongs_to', key: 'user_id' },
        [DBTablesEnum.GENERATE_SOURCE]: { type: 'belongs_to', key: 'generateSourceId' },
        [DBTablesEnum.RISK_DATA]: { type: 'belongs_to', key: 'riskDataId' },
    } as const;

    @field('generateSourceId') generateSourceId!: string;
    @field('riskDataId') riskDataId!: string;
    @field('efficientlyCheck') efficientlyCheck?: boolean;

    @field('user_id') userId!: string;
    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;

    @immutableRelation(DBTablesEnum.RISK_DATA, 'riskDataId') RiskData?: RiskDataModel;
    @immutableRelation(DBTablesEnum.GENERATE_SOURCE, 'generateSourceId') GenerateSource?: GenerateSourceModel;
    @immutableRelation(DBTablesEnum.USER_AUTH, 'user_id') UserAuth?: UserAuthModel;
}
export { GenerateRiskDataModel };
