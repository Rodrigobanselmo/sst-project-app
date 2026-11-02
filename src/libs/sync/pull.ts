import { database } from '@libs/watermelon';
import { RiskDataModel } from '@libs/watermelon/model/RiskDataModel';
import { CharacterizationRepository } from '@repositories/characterizationRepository';
import { formatActivities, IRiskDataCreate, RiskDataRepository } from '@repositories/riskDataRepository';
import { getSyncCharacterization } from '@services/api/sync/getSyncCharacterization';
import { createSyncJournal } from '@libs/sync/storage';
import { captureVisit } from '@libs/sync/planner';
import { baseKey } from '@libs/sync/journal';
import { parentFingerprint, parentTreeFingerprint, riskFingerprint } from '@libs/sync/sourceFingerprint';
import { acknowledgeSourceIds } from './acknowledgeSources';
import { VisitRefreshGate } from './visitFreshness';
import { pickEpiAnswers } from './epiAnswers';

interface IOptions { companyId: string; workspaceId: string }
export const onGenerateSyncCharacterizatinKey = ({ companyId, workspaceId, userId }: IOptions & { userId: number }) =>
    `mobile-sync-pull-v1:${userId}:${companyId}:${workspaceId}`;
export interface VisitPullResult { complete: boolean; pendingLocalChanges?: boolean; cancelled?: boolean }
const pulls = new Map<string, { task: Promise<VisitPullResult>; gate: VisitRefreshGate }>();

/** A pull refreshes clean records; it never acknowledges or overwrites a collected operation. */
export async function pullCharacterizations(options: IOptions & { userId: number; refreshGate?: VisitRefreshGate }): Promise<VisitPullResult> {
    const key = onGenerateSyncCharacterizatinKey(options);
    const prior = pulls.get(key);
    if (prior && !options.refreshGate) return prior.task;
    const gate = options.refreshGate || new VisitRefreshGate();
    const task = (async () => {
        if (prior) await prior.gate.stop();
        gate.assertActive();
        const journal = await createSyncJournal(options);
        await acknowledgeSourceIds(journal);
        await captureVisit(journal);
        const doc = await journal.read();
        const latest = new Map<string, typeof doc.entries[number]>();
        doc.entries.forEach((entry) => latest.set(baseKey(entry.operation.kind, entry.operation.entityId), entry));
        const dirty = (kind: 'CHARACTERIZATION' | 'RISK_DATA', id: string) => {
            const entry = latest.get(baseKey(kind, id));
            const deletion = latest.get(baseKey(kind === 'CHARACTERIZATION' ? 'CHARACTERIZATION_DELETE' : 'RISK_DATA_DELETE', id));
            return !!deletion || (!!entry && entry.receipt.state !== 'APPLIED');
        };
        const cursor = await database.localStorage.get<string>(key);
        const repository = new CharacterizationRepository();
        const riskRepository = new RiskDataRepository();
        const existing = (await repository.findAllByWorkspace(options)).characterizations;
        const fingerprints = new Map<string, string>();
        const childRiskIds = new Map<string, Set<string>>();
        await database.read(async () => {
            for (const parent of existing) {
                fingerprints.set(`parent:${parent.id}`, await parentFingerprint(parent));
                fingerprints.set(`tree:${parent.id}`, await parentTreeFingerprint(parent));
                const risks = await (parent.riskData as any).fetch() as RiskDataModel[];
                childRiskIds.set(parent.id, new Set(risks.map((risk) => risk.id)));
                for (const risk of risks) {
                    fingerprints.set(`risk:${risk.id}`, await riskFingerprint(risk));
                }
            }
        });
        const response = await getSyncCharacterization({ companyId: options.companyId, workspaceId: options.workspaceId,
            lastSync: cursor ? new Date(cursor) : undefined }, options.userId, gate.signal);
        gate.assertActive();
        let deferredAliases = false;
        let pendingLocalChanges = false;
        for (const server of response.characterizations) {
            gate.assertActive();
            let local = existing.find((row) => row.id === server.id || row.apiId === server.id);
            if (server.deleted_at) {
                const pendingChild = local && Array.from(latest.values()).some((entry) => entry.receipt.state !== 'APPLIED' &&
                    (entry.operation.payload.characterizationId === local!.id ||
                        entry.operation.payload.homogeneousGroupId === local!.id ||
                        childRiskIds.get(local!.id)?.has(entry.operation.entityId)));
                if (local && !dirty('CHARACTERIZATION', local.id) && !pendingChild) {
                    const hidden = await gate.run(() => repository.hideRemote(local!.id, fingerprints.get(`tree:${local!.id}`)!, server.updated_at));
                    if (!hidden) pendingLocalChanges = true;
                }
                else if (local) pendingLocalChanges = true;
                continue;
            }
            const values = { apiId: server.id, name: server.name, type: server.type,
                description: server.description, luminosity: server.luminosity, noiseValue: server.noiseValue,
                temperature: server.temperature, moisturePercentage: server.moisturePercentage,
                profileName: server.profileName, profileParentId: server.profileParentId,
                done_at: server.done_at, updatedAt: server.updated_at,
                hierarchiesIds: server.homogeneousGroup?.hierarchyOnHomogeneous
                    .filter((h) => !h.endDate && !h.deletedAt).map((h) => h.hierarchyId) || [] };
            let parentApplied = !dirty('CHARACTERIZATION', local?.id || server.id);
            await gate.run(async () => {
                if (!local) local = await repository.create({ ...values, id: server.id, userId: options.userId,
                    workspaceId: options.workspaceId, createdAt: server.created_at });
                else if (parentApplied) parentApplied = !!await repository.update(local.id, values, fingerprints.get(`parent:${local.id}`));
                if (!local) throw new Error('Não foi possível preservar o cadastro recebido.');
                await repository.mergeRemoteMedia(local.id, server.photos || [], server.files || [], journal);
                if (parentApplied && server.mobileSync) await journal.setBase('CHARACTERIZATION', local.id, { ...server.mobileSync, localSnapshot: { ...server.mobileSync.snapshot, id: local.id } });
            });
            if (!local) throw new Error('Não foi possível preservar o cadastro recebido.');
            if (!parentApplied) pendingLocalChanges = true;
            const risks = await (local.riskData as any).fetch() as RiskDataModel[];
            for (const serverRisk of server.homogeneousGroup?.riskFactorData || []) {
                const risk = risks.find((row) => row.id === serverRisk.id || row.apiId === serverRisk.id);
                // A split may already exist remotely while its POST receipt was
                // lost. Do not create a second local copy of the same pending
                // exposure before that receipt can resolve the source alias.
                if (!risk && risks.some((candidate) => candidate.riskId === serverRisk.riskId && dirty('RISK_DATA', candidate.id))) {
                    deferredAliases = true; continue;
                }
                if (risk && dirty('RISK_DATA', risk.id)) { pendingLocalChanges = true; continue; }
                if (risk && !fingerprints.has(`risk:${risk.id}`)) { pendingLocalChanges = true; continue; }
                const [adms, recs, sources, epis, engs] = risk ? await Promise.all([
                    (risk.admsToRiskData as any).fetch(), (risk.recsToRiskData as any).fetch(),
                    (risk.generateSourcesToRiskData as any).fetch(), (risk.episToRiskData as any).fetch(),
                    (risk.engsToRiskData as any).fetch(),
                ]) : [[], [], [], [], []];
                // Older APIs stored the activity list directly. The form uses
                // the object shape, while the untouched server snapshot below
                // retains the original JSON and all unknown evidence.
                const serverActivities = Array.isArray(serverRisk.activities) ? { activities: serverRisk.activities } : serverRisk.activities;
                const data: IRiskDataCreate = {
                    id: serverRisk.id, apiId: serverRisk.id, riskId: serverRisk.riskId,
                    probability: serverRisk.probability, probabilityAfter: serverRisk.probabilityAfter,
                    exposure: serverRisk.exposure, realActivity: serverActivities?.realActivity,
                    activities: serverActivities?.activities?.map((a) => ({ id: `${a.description || ''}${a.subActivity || ''}`,
                        name: a.description || '', description: a.subActivity })),
                    admsToRiskData: serverRisk.adms?.map((r) => ({ id: r.id, name: '', m2mId: adms.find((m: any) => m.recMedId === r.id)?.id })),
                    del_admsToRiskData: adms.filter((m: any) => !serverRisk.adms?.some((r) => r.id === m.recMedId)).map((m: any) => m.id),
                    recsToRiskData: serverRisk.recs?.map((r) => ({ id: r.id, name: '', m2mId: recs.find((m: any) => m.recMedId === r.id)?.id })),
                    del_recsToRiskData: recs.filter((m: any) => !serverRisk.recs?.some((r) => r.id === m.recMedId)).map((m: any) => m.id),
                    generateSourcesToRiskData: serverRisk.generateSources?.map((r) => ({ id: r.id, name: '', m2mId: sources.find((m: any) => m.generateSourceId === r.id)?.id })),
                    del_generateSourcesToRiskData: sources.filter((m: any) => !serverRisk.generateSources?.some((r) => r.id === m.generateSourceId)).map((m: any) => m.id),
                    engsToRiskData: serverRisk.engsToRiskFactorData?.map((r) => ({ id: r.recMedId, name: '', efficientlyCheck: r.efficientlyCheck,
                        m2mId: engs.find((m: any) => m.recMedId === r.recMedId)?.id })),
                    del_engsToRiskData: engs.filter((m: any) => !serverRisk.engsToRiskFactorData?.some((r) => r.recMedId === m.recMedId)).map((m: any) => m.id),
                    episToRiskData: serverRisk.epiToRiskFactorData?.map((r) => ({ id: String(r.epiId), name: r.epi.equipment,
                        ...pickEpiAnswers(r), description: r.epi.ca, efficientlyCheck: r.efficientlyCheck,
                        m2mId: epis.find((m: any) => m.epiId === r.epiId)?.id })),
                    del_episToRiskData: epis.filter((m: any) => !serverRisk.epiToRiskFactorData?.some((r) => r.epiId === m.epiId)).map((m: any) => m.id),
                };
                let applied = true;
                await gate.run(async () => {
                    if (risk) applied = !!await riskRepository.update(risk.id, { ...data, updatedAt: serverRisk.updatedAt }, fingerprints.get(`risk:${risk.id}`));
                    else await riskRepository.createRiskDataWithRecMedGs([data], local!.id, options.userId);
                    if (applied && serverRisk.mobileSync) await journal.setBase('RISK_DATA', risk?.id || serverRisk.id,
                        { ...serverRisk.mobileSync, localSnapshot: { ...serverRisk.mobileSync.snapshot, id: risk?.id || serverRisk.id, homogeneousGroupId: local!.id,
                            activities: JSON.parse(formatActivities(data)) } });
                });
                if (!applied) pendingLocalChanges = true;
            }
            // Only an explicit full snapshot can close a clean missing risk; incremental responses never delete.
            if (response.fullSnapshot === true) for (const risk of risks) {
                if (risk.deleted_at || server.homogeneousGroup?.riskFactorData?.some((remote) => remote.id === risk.id || remote.id === risk.apiId)) continue;
                if (dirty('RISK_DATA', risk.id) || !fingerprints.has(`risk:${risk.id}`)) { pendingLocalChanges = true; continue; }
                const hidden = await gate.run(() => riskRepository.hideRemote(risk.id, fingerprints.get(`risk:${risk.id}`)!));
                if (!hidden) pendingLocalChanges = true;
            }
        }
        gate.assertActive();
        await captureVisit(journal);
        gate.assertActive();
        const complete = !deferredAliases && !pendingLocalChanges;
        if (complete && response.latestVersion !== undefined) await gate.run(() => database.localStorage.set(key, new Date(response.latestVersion!).toISOString()));
        return { complete, pendingLocalChanges: deferredAliases || pendingLocalChanges };
    })();
    pulls.set(key, { task, gate });
    try { return await task; }
    catch (error: any) { if (!gate.active || error?.code === 'VISIT_REFRESH_CANCELLED') return { complete: false, cancelled: true }; throw error; }
    finally { if (pulls.get(key)?.task === task) pulls.delete(key); }
}
