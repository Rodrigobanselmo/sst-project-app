import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { RiskDataModel } from '@libs/watermelon/model/RiskDataModel';
import { canonical } from './journal';
const raw = (rows: any[]) => rows.map((row) => ({ ...row._raw })).sort((a, b) => a.id.localeCompare(b.id));
export async function parentFingerprint(row: CharacterizationModel) {
    const [hierarchies, employees] = await Promise.all([
        (row.characterizationToHierarchy as any).fetch(), (row.characterizationToEmployee as any).fetch(),
    ]);
    return canonical({ row: { ...row._raw }, hierarchies: raw(hierarchies), employees: raw(employees) });
}
export async function riskFingerprint(row: RiskDataModel) {
    const relations = await Promise.all([row.admsToRiskData, row.recsToRiskData, row.generateSourcesToRiskData,
        row.episToRiskData, row.engsToRiskData].map((relation: any) => relation.fetch()));
    return canonical({ row: { ...row._raw }, relations: relations.map(raw) });
}

/** Hiding a remote parent also hides its children from capture and the visit UI. */
export async function parentTreeFingerprint(row: CharacterizationModel) {
    const [parent, risks, photos] = await Promise.all([
        parentFingerprint(row), (row.riskData as any).fetch() as Promise<RiskDataModel[]>,
        (row.photos as any).fetch() as Promise<any[]>,
    ]);
    const children = await Promise.all(risks.map(async (risk) => ({ id: risk.id, snapshot: await riskFingerprint(risk) })));
    children.sort((a, b) => a.id.localeCompare(b.id));
    return canonical({ parent, risks: children, photos: raw(photos) });
}
