import { DBTablesEnum } from '@constants/enums/db-tables';
import { Model } from '@nozbe/watermelondb';
import { date, field, immutableRelation } from '@nozbe/watermelondb/decorators';
import { HierarchyModel } from '../HierarchyModel';
import { WorkspaceModel } from '../WorkspaceModel';

class WorkspaceHierarchyModel extends Model {
    static table = DBTablesEnum.MM_WOKSPACE_HIERARCHY;
    static associations = {
        [DBTablesEnum.WORKSPACE]: { type: 'belongs_to', key: 'workspaceId' },
        [DBTablesEnum.HIERARCHY]: { type: 'belongs_to', key: 'hierarchyId' },
    } as const;

    @field('hierarchyId') hierarchyId!: string;
    @field('workspaceId') workspaceId!: string;

    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;

    @immutableRelation(DBTablesEnum.WORKSPACE, 'workspaceId') Workspace?: WorkspaceModel;
    @immutableRelation(DBTablesEnum.HIERARCHY, 'hierarchyId') Hierarchy?: HierarchyModel;
}
export { WorkspaceHierarchyModel };
