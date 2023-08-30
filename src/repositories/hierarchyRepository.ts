import { DBTablesEnum } from '@constants/enums/db-tables';
import { HierarchyEnum } from '@constants/enums/hierarchy.enum';
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
    id: string;
    name: string;
    companyId?: string;
    userId: number;
    type: HierarchyEnum;
    description?: string;
    realDescription?: string;
    parentId?: string;
}

export class HierarchyRepository {
    constructor() {}

    async findManyByWorkspace({ workspaceId }: { workspaceId: string }) {
        const workspaceTable = database.get<WorkspaceModel>(DBTablesEnum.WORKSPACE);
        const workspace = await workspaceTable.find(workspaceId);
        const hierarchies: HierarchyModel[] = await (workspace?.hierarchies as any)?.fetch();

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

    async create(data: IHierarchyCreate) {
        await database.write(async () => {
            const hierarchyTable = database.get<HierarchyModel>(DBTablesEnum.HIERARCHY);

            const newCompany = await hierarchyTable.create((hierarchy) => {
                hierarchy._raw.id = data.id;
                hierarchy.name = data.name;
                hierarchy.userId = String(data.userId);
                hierarchy.description = data.description;
                hierarchy.realDescription = data.realDescription;
                hierarchy.type = data.type;
                hierarchy.parentId = data.parentId;
                hierarchy.companyId = data.companyId;

                hierarchy.status = StatusEnum.ACTIVE;
                hierarchy.created_at = new Date();
                hierarchy.updated_at = new Date();
            });

            // try {
            //     if (data.workspace)
            //         await Promise.all(
            //             data.workspace.map(async (workspace) => {
            //                 await this.createWorkspace(newCompany.id, workspace);
            //             }),
            //         );

            //     return newCompany;
            // } catch (error) {
            //     console.error(2, error);
            // }
        });
    }

    // async update(id: string, data: Partial<ICompanyCreate>) {
    //     await database.write(async () => {
    //         const companyTable = database.get<CompanyModel>(DBTablesEnum.COMPANY);

    //         try {
    //             const company = await companyTable.find(id);
    //             const newCompany = await company.update((company) => {
    //                 if (data.apiId) company.apiId = data.apiId;
    //                 if (data.name) company.name = data.name;
    //                 if (data.userId) company.userId = String(data.userId);
    //                 if (data.cnpj) company.cnpj = data.cnpj;
    //                 if (data.fantasy) company.fantasy = data.fantasy;
    //                 if (data.logoUrl) company.logoUrl = data.logoUrl;
    //                 if (data.isClinic) company.isClinic = data.isClinic;
    //                 if (data.isConsulting) company.isConsulting = data.isConsulting;

    //                 if (data.status) company.status = data.status;
    //                 company.updated_at = new Date();
    //             });

    //             try {
    //                 if (data.workspace)
    //                     await Promise.all(
    //                         data.workspace.map(async (workspace) => {
    //                             if (workspace.id) await this.updateWorkspace(workspace.id, workspace);
    //                             else await this.createWorkspace(id, workspace);
    //                         }),
    //                     );

    //                 return newCompany;
    //             } catch (error) {
    //                 console.error(error);
    //             }
    //         } catch (error) {
    //             console.error(error);
    //         }
    //     });
    // }
}
