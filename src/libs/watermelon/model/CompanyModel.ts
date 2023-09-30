import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { Model } from '@nozbe/watermelondb';
import { field, date, children, readonly, relation, lazy } from '@nozbe/watermelondb/decorators';
import { WorkspaceModel } from './WorkspaceModel';
import { CharacterizationModel } from './CharacterizationModel';
import { RiskModel } from './RiskModel';

class CompanyModel extends Model {
    static table = DBTablesEnum.COMPANY;
    static associations = {
        [DBTablesEnum.COMPANY_CHARACTERIZATION]: { type: 'has_many', foreignKey: 'companyId' },
        [DBTablesEnum.EMPLOYEE]: { type: 'has_many', foreignKey: 'companyId' },
        [DBTablesEnum.RISK]: { type: 'has_many', foreignKey: 'companyId' },
        [DBTablesEnum.USER_AUTH]: { type: 'belongs_to', key: 'user_id' },
    } as const;

    @field('apiId') apiId?: string;
    @field('name') name!: string;
    @field('cnpj') cnpj?: string;
    @field('fantasy') fantasy?: string;
    @field('logoUrl') logoUrl?: string;
    @field('isClinic') isClinic?: boolean;
    @field('isConsulting') isConsulting?: boolean;
    @field('status') status!: StatusEnum;

    @field('user_id') userId!: string;
    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;

    @children(DBTablesEnum.COMPANY_CHARACTERIZATION) characterization?: CharacterizationModel[];
    @children(DBTablesEnum.WORKSPACE) workspace?: WorkspaceModel[];
    @children(DBTablesEnum.RISK) risk?: RiskModel[];
}
export { CompanyModel };
