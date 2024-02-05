import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { Model } from '@nozbe/watermelondb';
import { field, date, children, readonly, relation, lazy } from '@nozbe/watermelondb/decorators';
import { CharacterizationPhotoModel } from './CharacterizationPhotoModel';
import { CharacterizationModel } from './CharacterizationModel';
import { CompanyModel } from './CompanyModel';
import { HierarchyEnum } from '@constants/enums/hierarchy.enum';
import { WorkspaceHierarchyModel } from './_MMModel/WorkspaceHierarchyModel';
import { CharacterizationHierarchyModel } from './_MMModel/CharacterizationHierarchyModel';
import { CharacterizationEmployeeModel } from './_MMModel/CharacterizationEmployeeModel';
import { HierarchyModel } from './HierarchyModel';

class EmployeeModel extends Model {
    static table = DBTablesEnum.EMPLOYEE;
    static associations = {
        [DBTablesEnum.USER_AUTH]: { type: 'belongs_to', key: 'user_id' },
        [DBTablesEnum.COMPANY]: { type: 'belongs_to', key: 'companyId' },
        [DBTablesEnum.HIERARCHY]: { type: 'belongs_to', key: 'hierarchyId' },
        [DBTablesEnum.MM_CHARACTERIZATION_EMPLOYEE]: { type: 'has_many', foreignKey: 'employeeId' },
    } as const;

    @field('apiId') apiId?: number;
    @field('name') name!: string;
    @field('socialName') socialName?: string;
    @field('cpf') cpf!: string;
    @field('rg') rg?: string;

    @field('companyId') companyId!: string;
    @field('hierarchyId') hierarchyId?: string;

    @field('user_id') userId!: string;
    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;

    @children(DBTablesEnum.MM_CHARACTERIZATION_EMPLOYEE)
    characterizationToEmployee?: CharacterizationEmployeeModel[];

    @relation(DBTablesEnum.COMPANY, 'companyId') Company?: CompanyModel;
    @relation(DBTablesEnum.HIERARCHY, 'hierarchyId') Hierarchy?: HierarchyModel;
}
export { EmployeeModel };
