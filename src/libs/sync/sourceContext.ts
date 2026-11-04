import { database } from '@libs/watermelon';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import { CompanyModel } from '@libs/watermelon/model/CompanyModel';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { createSyncJournal } from './storage';
export async function journalForSource(workspaceId: string, userId: number) {
    const workspace = await database.get<WorkspaceModel>(DBTablesEnum.WORKSPACE).find(workspaceId);
    const company = await database.get<CompanyModel>(DBTablesEnum.COMPANY).find(workspace.companyId);
    return createSyncJournal({ userId, workspaceId: workspace.apiId || workspace.id, companyId: company.apiId || company.id });
}
