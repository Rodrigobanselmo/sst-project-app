import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { database } from '@libs/watermelon';
import { CompanyModel } from '@libs/watermelon/model/CompanyModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import { Q } from '@nozbe/watermelondb';

export interface IWorkspaceCreate {
    id?: string;
    apiId?: string;
    name: string;
    abbreviation?: string;
    status?: StatusEnum;
    description?: string;
    cep?: string;
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    number?: string;
    complement?: string;
    withCharacterization?: boolean;
}

export interface ICompanyCreate {
    apiId?: string;
    name: string;
    cnpj: string;
    fantasy: string;
    logoUrl?: string;
    isClinic?: boolean;
    isConsulting?: boolean;
    status?: StatusEnum;

    userId: number;
    workspace?: IWorkspaceCreate[];
}

export class CompanyRepository {
    constructor() {}

    async findMany({ userId }: { userId: number }) {
        const userTable = database.get<UserAuthModel>(DBTablesEnum.USER_AUTH);
        const user = await userTable.find(String(userId));

        const companies: CompanyModel[] = await (user?.companies as any)?.fetch();

        return { companies };
    }

    async findOne(id: string) {
        const companyCollection = database.get<CompanyModel>(DBTablesEnum.COMPANY);

        const company = await companyCollection.find(id);
        const workspaces: WorkspaceModel[] = await (company?.workspace as any)?.fetch();

        return { company, workspaces };
    }

    async findCompanyByApiId({ apiId, userId }: { apiId: string; userId: number }) {
        const companyCollection = database.get<CompanyModel>(DBTablesEnum.COMPANY);
        const [company] = await companyCollection.query(Q.where('apiId', apiId), Q.where('user_id', userId)).fetch();
        // const workspaces: WorkspaceModel[] = await (company?.workspace as any)?.fetch();

        return { company };
    }

    async create(data: ICompanyCreate) {
        await database.write(async () => {
            const companyTable = database.get<CompanyModel>(DBTablesEnum.COMPANY);

            const newCompany = await companyTable.create((company) => {
                company.apiId = data.apiId;
                company.name = data.name;
                company.userId = String(data.userId);
                company.cnpj = data.cnpj;
                company.fantasy = data.fantasy;
                company.logoUrl = data.logoUrl;
                company.isClinic = data.isClinic;
                company.isConsulting = data.isConsulting;

                company.status = StatusEnum.ACTIVE;
                company.created_at = new Date();
                company.updated_at = new Date();
            });

            try {
                if (data.workspace)
                    await Promise.all(
                        data.workspace.map(async (workspace) => {
                            await this.createWorkspace(newCompany.id, workspace);
                        }),
                    );

                return newCompany;
            } catch (error) {
                console.error(error);
            }
        });
    }

    async update(id: string, data: Partial<ICompanyCreate>) {
        await database.write(async () => {
            const companyTable = database.get<CompanyModel>(DBTablesEnum.COMPANY);

            try {
                const company = await companyTable.find(id);
                const newCompany = await company.update((company) => {
                    if (data.apiId) company.apiId = data.apiId;
                    if (data.name) company.name = data.name;
                    if (data.userId) company.userId = String(data.userId);
                    if (data.cnpj) company.cnpj = data.cnpj;
                    if (data.fantasy) company.fantasy = data.fantasy;
                    if (data.logoUrl) company.logoUrl = data.logoUrl;
                    if (data.isClinic) company.isClinic = data.isClinic;
                    if (data.isConsulting) company.isConsulting = data.isConsulting;

                    if (data.status) company.status = data.status;
                    company.updated_at = new Date();
                });

                try {
                    if (data.workspace)
                        await Promise.all(
                            data.workspace.map(async (workspace) => {
                                if (workspace.id) await this.updateWorkspace(workspace.id, workspace);
                                else await this.createWorkspace(id, workspace);
                            }),
                        );

                    return newCompany;
                } catch (error) {
                    console.error(error);
                }
            } catch (error) {
                console.error(error);
            }
        });
    }

    async upsertByApiId({ workspace, ...data }: ICompanyCreate) {
        if (data.apiId) {
            const foundCompany = await this.findCompanyByApiId({ apiId: data.apiId, userId: data.userId });
            if (foundCompany?.company?.id) {
                if (workspace) {
                    workspace.forEach(async (works) => {
                        if (works.id) {
                            const workspaceFound = await this.findWorkspaceByApiId({
                                apiId: works.id,
                                userId: data.userId,
                            });

                            if (workspaceFound.workspace?.id) await this.updateWorkspace(works.id, works);
                            else await this.createWorkspace(foundCompany?.company?.id, works);
                        }
                    });
                }

                await this.update(foundCompany?.company?.id, data);
            }
        } else await this.create(data);
    }

    async findOneWorkspace(id: string) {
        const workspaceCollection = database.get<WorkspaceModel>(DBTablesEnum.WORKSPACE);
        const workspace = await workspaceCollection.find(id);

        return { workspace };
    }

    async findWorkspaceByApiId({ apiId, userId }: { apiId: string; userId: number }) {
        const workspaceTable = database.get<WorkspaceModel>(DBTablesEnum.WORKSPACE);
        const [workspace] = await workspaceTable.query(Q.where('apiId', apiId), Q.where('user_id', userId)).fetch();

        return { workspace };
    }

    async createWorkspace(companyId: string, workspace: IWorkspaceCreate) {
        return await database.write(async () => {
            const workspaceTable = database.get<WorkspaceModel>(DBTablesEnum.WORKSPACE);

            const newWorkspace = await workspaceTable.create((newWorkspace) => {
                newWorkspace.apiId = newWorkspace.id;
                newWorkspace.companyId = companyId;
                newWorkspace.name = workspace.name;
                newWorkspace.abbreviation = workspace.abbreviation;
                newWorkspace.description = workspace.description;
                newWorkspace.cep = workspace.cep;
                newWorkspace.street = workspace.street;
                newWorkspace.neighborhood = workspace.neighborhood;
                newWorkspace.city = workspace.city;
                newWorkspace.state = workspace.state;
                newWorkspace.number = workspace.number;
                newWorkspace.complement = workspace.complement;
                newWorkspace.status = StatusEnum.ACTIVE;
                newWorkspace.withCharacterization = workspace.withCharacterization;

                newWorkspace.created_at = new Date();
                newWorkspace.updated_at = new Date();
            });

            return newWorkspace;
        });
    }

    async updateWorkspace(id: string, data: Partial<IWorkspaceCreate>) {
        await database.write(async () => {
            const workspaceTable = database.get<WorkspaceModel>(DBTablesEnum.WORKSPACE);

            try {
                const workspace = await workspaceTable.find(id);
                const newWorkspace = await workspace.update((newWorkspace) => {
                    if (data.apiId) newWorkspace.apiId = data.apiId;
                    if (data.name) newWorkspace.name = data.name;
                    if (data.abbreviation) newWorkspace.abbreviation = data.abbreviation;
                    if (data.description) newWorkspace.description = data.description;
                    if (data.cep) newWorkspace.cep = data.cep;
                    if (data.street) newWorkspace.street = data.street;
                    if (data.neighborhood) newWorkspace.neighborhood = data.neighborhood;
                    if (data.city) newWorkspace.city = data.city;
                    if (data.state) newWorkspace.state = data.state;
                    if (data.number) newWorkspace.number = data.number;
                    if (data.complement) newWorkspace.complement = data.complement;
                    if (data.withCharacterization) newWorkspace.withCharacterization = data.withCharacterization;

                    if (data.status) newWorkspace.status = data.status;
                    newWorkspace.updated_at = new Date();
                });

                return newWorkspace;
            } catch (error) {
                console.error(error);
            }
        });
    }
}
