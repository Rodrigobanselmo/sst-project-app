import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { database } from '@libs/watermelon';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import { CompanyModel } from '@libs/watermelon/model/CompanyModel';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import { GenerateSourceModel } from '@libs/watermelon/model/GenerateSourceModel';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { RecMedModel } from '@libs/watermelon/model/RecMedModel';
import { IRiskDataActivities, RiskDataModel } from '@libs/watermelon/model/RiskDataModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import { EpisRiskDataModel } from '@libs/watermelon/model/_MMModel/EpisRiskDataModel';
import { Q } from '@nozbe/watermelondb';
import { asyncBatch } from '@utils/helpers/asyncBatch';
import { asyncEach } from '@utils/helpers/asyncEach';
import { RiskDataRepository } from './riskDataRepository';
import { CharacterizationFormProps } from '@screens/Characterization/types';
import { CharacterizationEmployeeModel } from '@libs/watermelon/model/_MMModel/CharacterizationEmployeeModel';
import { ExposureTypeEnum } from '@constants/enums/exposure.enum';

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
    startChar_at?: Date;
    lastSendApiCharacterization_at?: Date;
    userId: number;
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
        const [company] = await companyCollection
            .query(Q.where('id', apiId), Q.where('user_id', String(userId)))
            .fetch();

        return { company };
    }

    async create(data: ICompanyCreate) {
        await database.write(async () => {
            const companyTable = database.get<CompanyModel>(DBTablesEnum.COMPANY);

            const newCompany = await companyTable.create((company) => {
                if (data.apiId) company._raw.id = data.apiId;
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
                console.error(2, error);
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

    async upsertByApiId(data: ICompanyCreate) {
        if (data.apiId) {
            const foundCompany = await this.findCompanyByApiId({ apiId: data.apiId, userId: data.userId });

            if (foundCompany?.company?.id) {
                if (data.workspace) {
                    await asyncBatch(data.workspace, 10, async (works) => {
                        if (works.apiId) {
                            const workspaceFound = await this.findWorkspaceByApiId({
                                apiId: works.apiId,
                                userId: data.userId,
                            });

                            await database.write(async () => {
                                if (workspaceFound.workspace?.id)
                                    await this.updateWorkspace(workspaceFound.workspace.id as string, works);
                                else await this.createWorkspace(foundCompany?.company?.id, works);
                            });
                        }
                    });
                }

                delete data.workspace;
                await this.update(foundCompany?.company?.id, data);
            } else {
                await this.create(data);
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
        const [workspace] = await workspaceTable
            .query(Q.where('id', apiId), Q.where('user_id', String(userId)))
            .fetch();

        return { workspace };
    }

    private async createWorkspace(companyId: string, workspace: IWorkspaceCreate) {
        const workspaceTable = database.get<WorkspaceModel>(DBTablesEnum.WORKSPACE);

        const newWorkspace = await workspaceTable.create((newWorkspace) => {
            if (workspace.apiId) newWorkspace._raw.id = workspace.apiId;
            newWorkspace.apiId = workspace.apiId;
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
            newWorkspace.userId = String(workspace.userId);
            newWorkspace.status = StatusEnum.ACTIVE;
            if (workspace.startChar_at) newWorkspace.startChar_at = new Date(workspace.startChar_at);

            newWorkspace.created_at = new Date();
            newWorkspace.updated_at = new Date();
        });

        return newWorkspace;
    }

    async updateWorkspaceDB(id: string, data: Partial<IWorkspaceCreate>) {
        await database.write(async () => {
            this.updateWorkspace(id, data);
        });
    }

    private async updateWorkspace(id: string, data: Partial<IWorkspaceCreate>) {
        const workspaceTable = database.get<WorkspaceModel>(DBTablesEnum.WORKSPACE);

        try {
            const workspace = await workspaceTable.find(id);
            const newWorkspace = await workspace.update((newWorkspace) => {
                newWorkspace.updated_at = new Date();

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
                if (data.userId) newWorkspace.userId = String(workspace.userId);
                if (data.status) newWorkspace.status = data.status;
                if (data.startChar_at && !workspace.startChar_at)
                    newWorkspace.startChar_at = new Date(data.startChar_at);
                if (data.lastSendApiCharacterization_at)
                    newWorkspace.lastSendApiCharacterization_at = data.lastSendApiCharacterization_at;
            });

            return newWorkspace;
        } catch (error) {
            console.error(error);
        }
    }

    async getAll(workspaceId: string) {
        const riskDataRepository = new RiskDataRepository();
        const characterizationCollection = database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION);

        const characterizationsModel = await characterizationCollection.query(Q.where('workspaceId', workspaceId));

        const characterizations = await Promise.all(
            characterizationsModel.map(async (characterization) => {
                const [photosModel, riskDataModel, hierarchiesModel, employeesModel]: [
                    CharacterizationPhotoModel[],
                    RiskDataModel[],
                    HierarchyModel[],
                    EmployeeModel[],
                ] = await Promise.all([
                    (characterization?.photos as any)?.fetch(),
                    (characterization?.riskData as any)?.fetch(),
                    (characterization?.hierarchies as any)?.fetch(),
                    (characterization?.employees as any)?.fetch(),
                ]);

                const riskData = await Promise.all(
                    riskDataModel.map(async (riskDataModel) => {
                        const m2mData = await riskDataRepository.getRiskDataInfo(riskDataModel);
                        const riskDataAll = {
                            ...m2mData,
                            id: riskDataModel.id,
                            updatedAt: riskDataModel.updated_at,
                            exposure: riskDataModel.exposure as ExposureTypeEnum,
                            apiId: riskDataModel.apiId,
                            riskId: riskDataModel.riskId,
                            probability: riskDataModel.probability,
                            probabilityAfter: riskDataModel.probabilityAfter,
                            characterizationId: riskDataModel.characterizationId,
                            activities: riskDataModel.activities
                                ? (JSON.parse(riskDataModel.activities) as IRiskDataActivities)
                                : undefined,
                        };
                        return riskDataAll;
                    }),
                );

                const audios = (
                    characterization.audios ? JSON.parse(characterization.audios) : []
                ) as CharacterizationFormProps['audios'];
                const videos = (
                    characterization.videos ? JSON.parse(characterization.videos) : []
                ) as CharacterizationFormProps['videos'];

                return {
                    characterization,
                    riskData,
                    photos: photosModel,
                    hierarchies: hierarchiesModel,
                    employees: employeesModel,
                    audios,
                    videos,
                };
            }),
        );

        return { characterizations };
    }
}
