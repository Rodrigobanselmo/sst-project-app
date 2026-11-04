import { database } from '@libs/watermelon';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { Q } from '@nozbe/watermelondb';
import type { RiskDataModel } from '@libs/watermelon/model/RiskDataModel';
import type { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import type { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import type { CompanyModel } from '@libs/watermelon/model/CompanyModel';
import type { SyncOperationModel } from '@libs/watermelon/model/SyncOperationModel';
import { baseKey } from './journal';

export type AssessmentCatalogRisk = {
    id: string;
    name?: string;
    type?: string;
    severity?: number;
    activities?: unknown;
};
export type AssessmentCatalog = {
    version: 1;
    risk?: AssessmentCatalogRisk;
    epis?: Record<string, { id?: number; equipment?: string; ca?: string }>;
    recMeds?: Record<string, { id?: string; medName?: string; recName?: string }>;
};

/** A presentation-only view of the server base already preserved in SQLite.
 * Never write these values into global catalogues or into an edit payload.
 * Reading existing BASE rows directly avoids creating a device/journal while a
 * repository is inside database.read (which must never schedule a write).
 */
export async function assessmentCatalog(risk: RiskDataModel): Promise<AssessmentCatalog | undefined> {
    if (!risk.characterizationId) return undefined;
    const rows = await database.get<SyncOperationModel>('SyncOperation').query(
        Q.where('record_type', 'BASE'), Q.where('entity_key', baseKey('RISK_DATA', risk.id)),
    ).fetch();
    if (!rows.length) return undefined;
    const parent = await database.get<CharacterizationModel>(DBTablesEnum.COMPANY_CHARACTERIZATION).find(risk.characterizationId);
    const workspace = await database.get<WorkspaceModel>(DBTablesEnum.WORKSPACE).find(parent.workspaceId);
    const company = await database.get<CompanyModel>(DBTablesEnum.COMPANY).find(workspace.companyId);
    const key = `mobile-sync-v1:${risk.userId}:${company.apiId || company.id}:${workspace.apiId || workspace.id}`;
    const row = rows.find((candidate) => candidate.contextKey === key);
    if (!row) return undefined;
    const base = JSON.parse(row.data);
    const catalog = base.snapshot?.assessmentDetails?.catalogSnapshot;
    if (!catalog || catalog.version !== 1) return undefined;
    if (catalog.risk && String(catalog.risk.id) !== risk.riskId) return undefined;
    return catalog;
}
