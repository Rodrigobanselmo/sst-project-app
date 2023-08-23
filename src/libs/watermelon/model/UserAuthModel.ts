import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { Model, Q } from '@nozbe/watermelondb';
import { field, date, children, readonly, relation, lazy } from '@nozbe/watermelondb/decorators';
import { WorkspaceModel } from './WorkspaceModel';
import { CharacterizationModel } from './CharacterizationModel';
import { CompanyModel } from './CompanyModel';

class UserAuthModel extends Model {
    static table = DBTablesEnum.USER_AUTH;
    static associations = {
        [DBTablesEnum.COMPANY_CHARACTERIZATION]: { type: 'has_many', foreignKey: 'user_id' },
        [DBTablesEnum.COMPANY]: { type: 'has_many', foreignKey: 'user_id' },
        [DBTablesEnum.WORKSPACE]: { type: 'has_many', foreignKey: 'user_id' },
    } as const;

    @field('created_at') created_at?: Date;
    @field('updated_at') updated_at?: Date;

    @children(DBTablesEnum.COMPANY_CHARACTERIZATION) characterizations?: CharacterizationModel[];
    @children(DBTablesEnum.COMPANY) companies?: CompanyModel[];
    @children(DBTablesEnum.WORKSPACE) workspaces?: WorkspaceModel[];

    @lazy workspacesEnviroments = (this.workspaces as any)?.extend(Q.where('withCharacterization', true));

    // @lazy workspacesEnviroments = this.collections
    //     .get(DBTablesEnum.WORKSPACE)
    //     .query(Q.where('user_id', this.id), Q.where('withCharacterization', true));
}
export { UserAuthModel };
