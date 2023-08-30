import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { Model } from '@nozbe/watermelondb';
import { date, field, immutableRelation } from '@nozbe/watermelondb/decorators';
import { HierarchyModel } from '../HierarchyModel';
import { WorkspaceModel } from '../WorkspaceModel';

class CharacterizationHierarchyModel extends Model {
    static table = DBTablesEnum.MM_CHARACTERIZATION_HIERARCHY;
    static associations = {
        [DBTablesEnum.COMPANY_CHARACTERIZATION]: { type: 'belongs_to', key: 'characterizationId' },
        [DBTablesEnum.HIERARCHY]: { type: 'belongs_to', key: 'hierarchyId' },
    } as const;

    @field('hierarchyId') hierarchyId!: string;
    @field('characterizationId') characterizationId!: string;

    @date('created_at') created_at?: Date;
    @date('updated_at') updated_at?: Date;
    @date('deleted_at') deleted_at?: Date;

    @immutableRelation(DBTablesEnum.COMPANY_CHARACTERIZATION, 'characterizationId')
    CompanyCharacterization?: CharacterizationModel;
    @immutableRelation(DBTablesEnum.HIERARCHY, 'hierarchyId') Hierarchy?: HierarchyModel;
}
export { CharacterizationHierarchyModel };
