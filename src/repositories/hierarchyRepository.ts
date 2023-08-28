import { DBTablesEnum } from '@constants/enums/db-tables';
import { MeasuresTypeEnum, RecTypeEnum } from '@constants/enums/risk.enum';
import { StatusEnum } from '@constants/enums/status.enum';
import { database } from '@libs/watermelon';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import { Q } from '@nozbe/watermelondb';

export interface IHierarchyCreate {
    name: string;
    companyId?: string;
    userId: number;
}

export class HierarchyRepository {
    constructor() {}

    async findManyByWorkspace({ workspaceId }: { workspaceId: string }) {
        const workspaceTable = database.get<WorkspaceModel>(DBTablesEnum.WORKSPACE);
        const workspace = await workspaceTable.find(workspaceId);

        return { hierarchies };
    }

    async findByIds({ ids }: { ids: string[] }) {
        const hierarchyCollection = database.get<HierarchyModel>(DBTablesEnum.HIERARCHY);
        const hierarchies = await hierarchyCollection.query(Q.where('id', Q.oneOf(ids)));

        return { hierarchies };
    }

    async findOne(id: string) {
        const hierarchyCollection = database.get<HierarchyModel>(DBTablesEnum.HIERARCHY);

        const hierarchy = await hierarchyCollection.find(id);

        return { hierarchy };
    }
}
