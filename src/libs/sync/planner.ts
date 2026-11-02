import { CompanyRepository } from '@repositories/companyRepository';
import { SyncJournal, baseKey, canonical } from './journal';
import { SyncDraft, SyncKind } from './types';
import uuid from 'react-native-uuid';
import { persistVisitMedia } from '@utils/helpers/durableMedia';
import { CharacterizationRepository } from '@repositories/characterizationRepository';

const sorted = (values: any[]) => [...values].sort((a, b) => typeof a?.epiId === 'number' && typeof b?.epiId === 'number' ? a.epiId - b.epiId :
    String(a?.recMedId ?? a).localeCompare(String(b?.recMedId ?? b)));
const nullable = (value: any) => value === undefined ? null : value;
// Text inputs render an absent optional value as ''. That is still absence,
// unlike '0', 0 or whitespace entered by the user. Normalize comparisons too:
// older server rows may contain either null or an empty optional string.
const optionalText = (value: any) => value === '' ? null : nullable(value);
const parentOptionalTextFields = ['description', 'luminosity', 'moisturePercentage', 'noiseValue', 'temperature', 'profileName', 'profileParentId'] as const;
const optionalParentTexts = (row: Record<string, any>) => Object.fromEntries(parentOptionalTextFields.map((key) => [key, optionalText(row[key])]));
const riskActivities = (value: any) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return nullable(value);
    const result = { ...value };
    // Keep all other structured/unknown activity evidence. An empty optional
    // free-text field does not introduce a change, while clearing text does.
    if (optionalText(result.realActivity) === null) delete result.realActivity;
    return result;
};
export function characterizationSnapshot(row: any, hierarchyIds: string[]) {
    // The existing non-optional SQLite date column represents "not completed"
    // as 0. @date reads that sentinel as Date(0), which is truthy in JavaScript.
    // Normalize only completion here; real dates and source evidence stay intact.
    const completedAt = row.done_at ? new Date(row.done_at) : undefined;
    return { id: row.id, name: row.name, type: row.type, ...optionalParentTexts(row),
        done_at: completedAt && completedAt.getTime() !== 0 ? completedAt.toISOString() : null,
        hierarchyIds: Array.from(new Set(hierarchyIds)).sort() };
}
export function riskSnapshot(row: any) {
    // The offline form does not own the server's assessment periods. A newly
    // collected risk gets its effective date from the explicitly reviewed
    // operation.decision; created_at/device time must never invent that date.
    // Keep imported period metadata in the journal base, outside this edit patch.
    return { id: row.id, riskId: row.riskId, homogeneousGroupId: row.characterizationId,
        exposure: optionalText(row.exposure), activities: riskActivities(row.activities),
        probability: nullable(row.probability), probabilityAfter: nullable(row.probabilityAfter),
        generateSources: sorted((row.generateSourcesToRiskData || []).map((r: any) => r.id)),
        adms: sorted((row.admsToRiskData || []).map((r: any) => r.id)),
        recs: sorted((row.recsToRiskData || []).map((r: any) => r.id)),
        engs: sorted((row.engsToRiskData || []).map((r: any) => ({ recMedId: r.id, efficientlyCheck: nullable(r.efficientlyCheck) }))),
        // Storage preserves all imported EPI answers. The current UI/planner
        // edits efficacy only; never derive the other answers from its checkbox.
        epis: sorted((row.episToRiskData || []).map((r: any) => ({ epiId: Number(r.id), efficientlyCheck: nullable(r.efficientlyCheck) }))),
    };
}
export function patchFromBase(snapshot: Record<string, any>, base?: Record<string, any>) {
    if (!base) return snapshot;
    return Object.fromEntries(Object.entries(snapshot).filter(([key, value]) => canonical(value) !== canonical(base[key])));
}
const parentPatchFromBase = (snapshot: Record<string, any>, base?: Record<string, any>) =>
    patchFromBase(snapshot, base && { ...base, ...optionalParentTexts(base) });
const riskPatchFromBase = (snapshot: Record<string, any>, base?: Record<string, any>) =>
    patchFromBase(snapshot, base && { ...base, exposure: optionalText(base.exposure), activities: riskActivities(base.activities) });

/** Read a whole visit before any pull. No timestamp can make an unsuccessful item disappear. */
export async function captureVisit(journal: SyncJournal): Promise<void> {
    const data = await new CompanyRepository().getAll(journal.context.workspaceId, journal.context.userId);
    const doc = await journal.read();
    const repository = new CharacterizationRepository();
    // Rescue media created by older app versions in cache. Each failure remains its own pending item.
    for (const row of data.characterizations) {
        for (const photo of row.photos) if (!photo.apiId) {
            try {
                const uri = await persistVisitMedia(photo.photoUrl, 'photo');
                if (uri !== photo.photoUrl) await repository.updatePhoto(photo.id, { photoUrl: uri }, photo.photoUrl);
                photo.photoUrl = uri;
            } catch { /* Keep the original reference, and still synchronize the rest of the visit. */ }
        }
        for (const kind of ['audios', 'videos'] as const) for (const file of row[kind] || []) if (!file.apiId) {
            try {
                const id = file.id || doc.entries.find((entry) => entry.operation.payload.uri === file.uri &&
                    entry.operation.payload.characterizationId === row.characterization.id)?.operation.entityId || String(uuid.v4());
                const uri = await persistVisitMedia(file.uri, kind === 'audios' ? 'audio' : 'video');
                await repository.relocateFile(row.characterization.id, kind, file.uri, uri, id);
                file.id = id; file.uri = uri;
            } catch { /* Missing media must not block the JSON or other files from leaving the device. */ }
        }
    }
    const refs: Record<string, string> = {};
    const add = async (drafts: SyncDraft[]) => {
        const entries = await journal.capture(drafts);
        entries.forEach((e) => { refs[baseKey(e.operation.kind, e.operation.entityId)] = e.operation.operationId; });
    };
    const catalog: SyncDraft[] = [];
    for (const row of data.characterizations) {
        for (const risk of row.riskData) {
            for (const source of risk.generateSourcesToRiskData || []) {
                if (!source.apiId && !catalog.some((d) => d.entityId === source.id)) catalog.push({
                    kind: 'GENERATE_SOURCE', entityId: source.id,
                    payload: { id: source.id, riskId: source.riskId, name: source.name, returnIfExist: true },
                });
            }
            for (const [items, field] of [[risk.recsToRiskData, 'redName'], [risk.admsToRiskData, 'medName'], [risk.engsToRiskData, 'medName']] as const) {
                for (const item of items || []) if (!item.apiId && !catalog.some((d) => d.kind === 'REC_MED' && d.entityId === item.id)) catalog.push({
                    kind: 'REC_MED', entityId: item.id,
                    payload: { id: item.id, riskId: item.riskId, [field]: item.name, returnIfExist: true },
                });
            }
        }
    }
    await add(catalog);
    const parents: SyncDraft[] = [];
    const groups: SyncDraft[] = [];
    const riskDrafts: SyncDraft[] = [];
    const media: SyncDraft[] = [];
    const deferredParents: { kind: SyncKind; entityId: string; snapshot: Record<string, any>; dependencies: string[] }[] = [];
    for (const row of data.characterizations) {
        const parent = row.characterization;
        if ((parent as any).status === 'INACTIVE') continue;
        const hierarchyIds = row.hierarchies.map((h) => h.apiId || h.id);
        const employeesByHierarchy: Record<string, number[]> = {};
        row.employees.forEach((employee) => {
            if (employee.hierarchyId && employee.apiId) {
                (employeesByHierarchy[employee.hierarchyId] ||= []).push(employee.apiId);
            }
        });
        for (const [parentId, employeesIds] of Object.entries(employeesByHierarchy)) {
            const id = parent.id + parentId;
            hierarchyIds.push(id);
            groups.push({ kind: 'SUB_OFFICE', entityId: id, payload: { id, parentId, employeesIds: employeesIds.sort((a, b) => a - b),
                name: parent.profileName || parent.name } });
        }
        const snapshot = characterizationSnapshot(parent, hierarchyIds);
        const base = doc.bases[baseKey('CHARACTERIZATION', parent.id)];
        const payload = parentPatchFromBase(snapshot, base?.localSnapshot || base?.snapshot);
        if (Object.keys(payload).length) deferredParents.push({ kind: 'CHARACTERIZATION', entityId: parent.id, snapshot,
            dependencies: Object.keys(employeesByHierarchy).map((h) => parent.id + h) });
        for (const photo of row.photos) if (!photo.apiId) media.push({ kind: 'PHOTO', entityId: photo.id,
            payload: { characterizationId: parent.id, uri: photo.photoUrl, name: photo.name || parent.name } });
        for (const [files, kind] of [[row.audios, 'AUDIO'], [row.videos, 'VIDEO']] as const) {
            for (const file of files || []) if (!file.apiId) media.push({ kind,
                entityId: file.id || doc.entries.find((entry) => entry.operation.kind === kind &&
                    entry.operation.payload.characterizationId === parent.id && entry.operation.payload.uri === file.uri)?.operation.entityId || String(uuid.v4()),
                payload: { characterizationId: parent.id, uri: file.uri, name: kind === 'AUDIO' ? 'Áudio da visita' : 'Vídeo da visita' } });
        }
        for (const risk of row.riskData) {
            if ((risk as any).deleted_at) continue;
            const snapshot = riskSnapshot(risk);
            const base = doc.bases[baseKey('RISK_DATA', risk.id)];
            const payload = riskPatchFromBase(snapshot, base?.localSnapshot || base?.snapshot);
            if (!Object.keys(payload).length) continue;
            riskDrafts.push({ kind: 'RISK_DATA', entityId: risk.id, payload: { ...payload,
                homogeneousGroupId: snapshot.homogeneousGroupId, riskId: snapshot.riskId },
                baseSnapshotHash: base?.baseSnapshotHash,
                dependsOn: [...catalog.filter((d) => [
                    ...(snapshot.generateSources || []), ...(snapshot.adms || []), ...(snapshot.recs || []),
                    ...(snapshot.engs || []).map((e: any) => e.recMedId),
                ].includes(d.entityId)).map((d) => refs[baseKey(d.kind, d.entityId)])].filter(Boolean) });
        }
    }
    await add(groups);
    // Principal profiles are created before their children.
    deferredParents.sort((a, b) => Number(!!a.snapshot.profileParentId) - Number(!!b.snapshot.profileParentId));
    for (const parent of deferredParents) {
        const base = doc.bases[baseKey('CHARACTERIZATION', parent.entityId)];
        const payload = parentPatchFromBase(parent.snapshot, base?.localSnapshot || base?.snapshot);
        parents.push({ kind: 'CHARACTERIZATION', entityId: parent.entityId, payload,
            baseSnapshotHash: base?.baseSnapshotHash, dependsOn: [
                ...parent.dependencies.map((id) => refs[baseKey('SUB_OFFICE', id)]),
                refs[baseKey('CHARACTERIZATION', parent.snapshot.profileParentId || '')],
            ].filter(Boolean) });
        await add([parents[parents.length - 1]]);
    }
    riskDrafts.forEach((draft) => {
        draft.dependsOn = [...(draft.dependsOn || []), refs[baseKey('CHARACTERIZATION', draft.payload.homogeneousGroupId)]].filter(Boolean);
    });
    await add(riskDrafts);
    // Upload backup is independent of application dependencies, so a rejected risk cannot block photos.
    await add(media);
}
