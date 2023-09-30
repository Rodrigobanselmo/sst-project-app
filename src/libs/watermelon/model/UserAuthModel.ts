import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { Model, Q } from '@nozbe/watermelondb';
import { field, date, children, readonly, relation, lazy } from '@nozbe/watermelondb/decorators';
import { WorkspaceModel } from './WorkspaceModel';
import { CharacterizationModel } from './CharacterizationModel';
import { CompanyModel } from './CompanyModel';
import { RiskModel } from './RiskModel';
import { RiskDataModel } from './RiskDataModel';
import { RecMedModel } from './RecMedModel';
import { GenerateSourceModel } from './GenerateSourceModel';
import { GenerateRiskDataModel } from './_MMModel/GenerateRiskDataModel';
import { EpisRiskDataModel } from './_MMModel/EpisRiskDataModel';
import { EngsRiskDataModel } from './_MMModel/EngsRiskDataModel';
import { AdmsRiskDataModel } from './_MMModel/AdmsRiskDataModel';

class UserAuthModel extends Model {
    static table = DBTablesEnum.USER_AUTH;
    static associations = {
        [DBTablesEnum.COMPANY_CHARACTERIZATION]: { type: 'has_many', foreignKey: 'user_id' },
        [DBTablesEnum.COMPANY]: { type: 'has_many', foreignKey: 'user_id' },
        [DBTablesEnum.WORKSPACE]: { type: 'has_many', foreignKey: 'user_id' },
        [DBTablesEnum.EMPLOYEE]: { type: 'has_many', foreignKey: 'user_id' },

        [DBTablesEnum.MM_ADMS_TO_RISK_DATA]: { type: 'has_many', foreignKey: 'user_id' },
        [DBTablesEnum.MM_ENGS_TO_RISK_DATA]: { type: 'has_many', foreignKey: 'user_id' },
        [DBTablesEnum.MM_EPIS_TO_RISK_DATA]: { type: 'has_many', foreignKey: 'user_id' },
        [DBTablesEnum.MM_GENERATE_TO_RISK_DATA]: { type: 'has_many', foreignKey: 'user_id' },
        [DBTablesEnum.GENERATE_SOURCE]: { type: 'has_many', foreignKey: 'user_id' },
        [DBTablesEnum.REC_MED]: { type: 'has_many', foreignKey: 'user_id' },
        [DBTablesEnum.RISK_DATA]: { type: 'has_many', foreignKey: 'user_id' },
        [DBTablesEnum.RISK]: { type: 'has_many', foreignKey: 'user_id' },
    } as const;

    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;

    @children(DBTablesEnum.COMPANY_CHARACTERIZATION) characterizations?: CharacterizationModel[];
    @children(DBTablesEnum.COMPANY) companies?: CompanyModel[];
    @children(DBTablesEnum.WORKSPACE) workspaces?: WorkspaceModel[];

    @children(DBTablesEnum.MM_ADMS_TO_RISK_DATA) admsToRiskData?: AdmsRiskDataModel[];
    @children(DBTablesEnum.MM_ENGS_TO_RISK_DATA) engsToRiskData?: EngsRiskDataModel[];
    @children(DBTablesEnum.MM_EPIS_TO_RISK_DATA) episToRiskData?: EpisRiskDataModel[];
    @children(DBTablesEnum.MM_GENERATE_TO_RISK_DATA) generateToRiskData?: GenerateRiskDataModel[];
    @children(DBTablesEnum.GENERATE_SOURCE) generate?: GenerateSourceModel[];
    @children(DBTablesEnum.REC_MED) recMeds?: RecMedModel[];
    @children(DBTablesEnum.RISK_DATA) riskData?: RiskDataModel[];
    @children(DBTablesEnum.RISK) risks?: RiskModel[];

    @lazy workspacesEnviroments = (this.workspaces as any)?.extend(Q.where('startChar_at', Q.notEq(null)));
}
export { UserAuthModel };
