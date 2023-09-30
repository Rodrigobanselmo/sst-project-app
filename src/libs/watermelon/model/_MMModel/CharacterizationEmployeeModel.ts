import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { Model } from '@nozbe/watermelondb';
import { date, field, immutableRelation } from '@nozbe/watermelondb/decorators';
import { HierarchyModel } from '../HierarchyModel';
import { WorkspaceModel } from '../WorkspaceModel';

class CharacterizationEmployeeModel extends Model {
    static table = DBTablesEnum.MM_CHARACTERIZATION_EMPLOYEE;
    static associations = {
        [DBTablesEnum.COMPANY_CHARACTERIZATION]: { type: 'belongs_to', key: 'characterizationId' },
        [DBTablesEnum.EMPLOYEE]: { type: 'belongs_to', key: 'employeeId' },
    } as const;

    @field('employeeId') employeeId!: string;
    @field('characterizationId') characterizationId!: string;

    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;

    @immutableRelation(DBTablesEnum.COMPANY_CHARACTERIZATION, 'characterizationId')
    CompanyCharacterization?: CharacterizationModel;
    @immutableRelation(DBTablesEnum.EMPLOYEE, 'employeeId') Hierarchy?: HierarchyModel;
}
export { CharacterizationEmployeeModel };
