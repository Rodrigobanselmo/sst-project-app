import { DBTablesEnum } from '@constants/enums/db-tables';
import { HierarchyEnum } from '@constants/enums/hierarchy.enum';
import { MeasuresTypeEnum, RecTypeEnum } from '@constants/enums/risk.enum';
import { StatusEnum } from '@constants/enums/status.enum';
import { database } from '@libs/watermelon';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import { CharacterizationEmployeeModel } from '@libs/watermelon/model/_MMModel/CharacterizationEmployeeModel';
import { Q } from '@nozbe/watermelondb';

export interface IEmployeeCreate {
    id: string;
    apiId?: number;
    name: string;
    companyId: string;
    userId: number;
    socialName?: HierarchyEnum;
    cpf: string;
    rg?: string;
}

export class EmployeeRepository {
    constructor() {}

    async findManyByWorkspaceId({ workspaceId }: { workspaceId: string }) {
        const workspaceTable = database.get<WorkspaceModel>(DBTablesEnum.WORKSPACE);
        const workspace = await workspaceTable.find(workspaceId);

        const employeeTable = database.get<EmployeeModel>(DBTablesEnum.EMPLOYEE);
        const employees = await employeeTable.query(Q.where('companyId', workspace.companyId)).fetch();

        return { employees };
    }

    async findManyByCompanyId({ companyId }: { companyId: string }) {
        const employeeTable = database.get<EmployeeModel>(DBTablesEnum.EMPLOYEE);
        const employees = await employeeTable.query(Q.where('companyId', companyId)).fetch();

        return { employees };
    }

    async findByIds({ ids }: { ids: string[] }) {
        const employeeTable = database.get<EmployeeModel>(DBTablesEnum.EMPLOYEE);
        const employees = await employeeTable.query(Q.where('id', Q.oneOf(ids)));

        return { employees };
    }

    async findOne(id: string) {
        const employeeTable = database.get<EmployeeModel>(DBTablesEnum.EMPLOYEE);

        const employee = await employeeTable.find(id);

        return { employee };
    }

    async create(data: IEmployeeCreate) {
        await database.write(async () => {
            const employeeTable = database.get<EmployeeModel>(DBTablesEnum.EMPLOYEE);

            const newEmployee = await employeeTable.create((employee) => {
                employee._raw.id = data.id;
                employee.apiId = data.apiId;
                employee.name = data.name;
                employee.userId = String(data.userId);
                employee.socialName = data.socialName;
                employee.cpf = data.cpf;
                employee.rg = data.rg;
                employee.companyId = data.companyId;

                employee.created_at = new Date();
                employee.updated_at = new Date();
            });

            return newEmployee;
        });
    }

    async updateMMCharacterization(id: string, data: Partial<any>) {
        await database.write(async () => {
            const charEmployeeTable = database.get<CharacterizationEmployeeModel>(
                DBTablesEnum.MM_CHARACTERIZATION_EMPLOYEE,
            );

            try {
                const charEmployee = await charEmployeeTable.find(id);
                const newRecMed = await charEmployee.update((recMed) => {
                    if (data.apiId) recMed.apiId = data.apiId;
                    if (data.characterizationId) recMed.characterizationId = data.characterizationId;
                    recMed.updated_at = new Date();
                });

                return newRecMed;
            } catch (error) {
                console.error(error);
            }
        });
    }
}
