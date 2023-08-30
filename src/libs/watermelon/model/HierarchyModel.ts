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

class HierarchyModel extends Model {
    static table = DBTablesEnum.HIERARCHY;
    static associations = {
        [DBTablesEnum.USER_AUTH]: { type: 'belongs_to', key: 'user_id' },
        [DBTablesEnum.COMPANY]: { type: 'belongs_to', key: 'companyId' },
        [DBTablesEnum.MM_WOKSPACE_HIERARCHY]: { type: 'has_many', foreignKey: 'hierarchyId' },
        [DBTablesEnum.MM_CHARACTERIZATION_HIERARCHY]: { type: 'has_many', foreignKey: 'hierarchyId' },
    } as const;

    @field('apiId') apiId?: string;
    @field('name') name!: string;
    @field('type') type!: HierarchyEnum;
    @field('description') description?: string;
    @field('realDescription') realDescription?: string;
    @field('status') status!: StatusEnum;

    @field('companyId') companyId?: string;
    @field('parentId') parentId?: string;

    @field('user_id') userId!: string;
    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;

    @children(DBTablesEnum.MM_WOKSPACE_HIERARCHY) workspaceToHierarchy?: WorkspaceHierarchyModel[];
    @children(DBTablesEnum.MM_CHARACTERIZATION_HIERARCHY)
    characterizationToHierarchy?: CharacterizationHierarchyModel[];

    @relation(DBTablesEnum.COMPANY, 'companyId') Company?: CompanyModel;
}
export { HierarchyModel };
