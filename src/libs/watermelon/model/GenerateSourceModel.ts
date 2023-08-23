import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { Model } from '@nozbe/watermelondb';
import { field, date, children, readonly, relation, lazy } from '@nozbe/watermelondb/decorators';
import { CharacterizationPhotoModel } from './CharacterizationPhotoModel';
import { CharacterizationModel } from './CharacterizationModel';
import { CompanyModel } from './CompanyModel';
import { UserAuthModel } from './UserAuthModel';
import { RiskModel } from './RiskModel';
import { GenerateRiskDataModel } from './_MMModel/GenerateRiskDataModel';

class GenerateSourceModel extends Model {
    static table = DBTablesEnum.GENERATE_SOURCE;
    static associations = {
        [DBTablesEnum.MM_GENERATE_TO_RISK_DATA]: { type: 'has_many', foreignKey: 'generateSourceId' },
        [DBTablesEnum.RISK]: { type: 'belongs_to', key: 'riskId' },
        [DBTablesEnum.USER_AUTH]: { type: 'belongs_to', key: 'user_id' },
    } as const;

    @field('apiId') apiId?: string;
    @field('name') name!: string;
    @field('riskId') riskId!: string;

    @field('user_id') userId!: string;
    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;

    @children(DBTablesEnum.MM_GENERATE_TO_RISK_DATA) generateRiskData?: GenerateRiskDataModel[];

    @relation(DBTablesEnum.RISK, 'riskId') Risk?: RiskModel;
    @relation(DBTablesEnum.USER_AUTH, 'user_id') UserAuth?: UserAuthModel;
}
export { GenerateSourceModel };
