import { baseKey, canonical, mediaKind, SyncJournal } from './journal';
import { SyncDocument, SyncEntry, SyncOperation, SyncReceipt } from './types';

export function visitAllowsCorrection(kind: string): boolean {
    return kind !== 'CHARACTERIZATION_DELETE';
}
export interface VisitPreference { intent: 'NEW_CONDITION' | 'CORRECTION'; effectiveFrom?: string; reason: string }
export interface VisitSelection extends VisitPreference { operationId: string }
export interface VisitPlanRequest { contractVersion: 1; planId: string; deviceId: string; workspaceId: string; reviewHead?: string; reviewContextHash?: string; operations: SyncOperation[] }
export interface VisitDecisionClient {
    createPlan(request: VisitPlanRequest): Promise<{ planId: string; head: string; operations: SyncOperation[] }>;
    review?(request: { contractVersion: 1; deviceId: string; workspaceId: string; operationIds: string[]; previousHead?: string }): Promise<{
        contractVersion: 1; reviewHead: string; reviewContextHash: string;
        items: { operationId: string; kind: string; entityId: string; collectedPayload: any; currentSnapshot: any; currentBaseSnapshotHash?: string; baseMatches: boolean; effectiveFrom?: string;
            changedFields: { field: string; currentValue: any; collectedValue: any }[] }[]; context: any;
    }>;
}
const settingsKey = 'visit-planning-v1';
interface Planning { defaults?: VisitPreference; choices: Record<string, VisitPreference>; pendingPlan?: VisitPlanRequest; abandonedPlans?: VisitPlanRequest[] }
const empty = (): Planning => ({ choices: {} });
export function validCivilDate(value?: string): value is string {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function preference(value: VisitPreference, allowPeriodDate = false): VisitPreference {
    if (!value || !['NEW_CONDITION', 'CORRECTION'].includes(value.intent) || !value.reason?.trim()) throw new Error('Escolha o tipo da alteração e informe o motivo.');
    if ((value.intent === 'NEW_CONDITION' || value.effectiveFrom) && !validCivilDate(value.effectiveFrom)) throw new Error('Informe uma data válida para esta condição.');
    if (value.intent === 'CORRECTION' && !allowPeriodDate && value.effectiveFrom) {
        // A visit-wide correction never moves every existing period to one date.
        return { intent: value.intent, reason: value.reason.trim() };
    }
    return { intent: value.intent, reason: value.reason.trim(), ...(value.effectiveFrom && { effectiveFrom: value.effectiveFrom }) };
}
export function getReviewContext(entry: SyncEntry, doc?: SyncDocument) {
    const error = entry.receipt.error;
    const expectedHead = error?.expectedHead || error?.details?.expectedHead;
    const reviewContextHash = error?.reviewContextHash || error?.details?.reviewContextHash;
    const snapshot = doc?.bases[baseKey(entry.operation.kind, entry.operation.entityId)]?.snapshot;
    const start = error?.effectiveFrom || error?.details?.effectiveFrom || snapshot?.startDate || snapshot?.assessmentDetails?.startDate;
    const periodStart = typeof start === 'string' && validCivilDate(start.slice(0, 10)) ? start.slice(0, 10) : undefined;
    const conflict = !!(error?.currentSnapshotHash || error?.details?.currentSnapshotHash);
    const history = entry.receipt.state === 'NEEDS_REVIEW' && !mediaKind(entry.operation.kind) && !conflict &&
        ['SST_DECISION_REQUIRED', 'SST_REVISION_CONFLICT', 'SST_DECISION_PLAN_STALE', 'MOBILE_DECISION_PLAN_STALE', 'SST_STRUCTURE_ARCHIVE_REQUIRES_NEW_CONDITION'].includes(error?.code || '') &&
        typeof expectedHead === 'string' && /^[a-f0-9]{64}$/.test(expectedHead);
    return { type: conflict ? 'BASE_CONFLICT' as const : history ? 'HISTORY' as const : 'OTHER' as const,
        eligible: history, periodStart, expectedHead, reviewContextHash };
}
export async function loadVisitDefaults(journal: SyncJournal): Promise<VisitPreference | undefined> {
    return (await journal.getSetting<Planning>(settingsKey))?.defaults;
}
export async function saveVisitDefaults(journal: SyncJournal, defaults?: VisitPreference): Promise<void> {
    const normalized = defaults ? preference(defaults) : undefined;
    await journal.updateSetting<Planning>(settingsKey, (previous) => ({ ...(previous || empty()), defaults: normalized }));
}
export async function loadVisitChoices(journal: SyncJournal): Promise<Record<string, VisitPreference>> {
    return (await journal.getSetting<Planning>(settingsKey))?.choices || {};
}
export async function saveVisitChoice(journal: SyncJournal, operationId: string, choice?: VisitPreference): Promise<void> {
    const normalized = choice ? preference(choice, true) : undefined;
    await journal.updateSetting<Planning>(settingsKey, (previous) => {
        const next = previous || empty(); next.choices ||= {};
        if (normalized) next.choices[operationId] = normalized; else delete next.choices[operationId];
        return next;
    });
}
/** Called only from an explicit UI action. It exposes current values; it never adopts a new source base. */
export async function refreshVisitDecisionReview(journal: SyncJournal, client: VisitDecisionClient): Promise<void> {
    if (!client.review) throw new Error('A atualização da revisão não está disponível. A coleta permanece no aparelho.');
    const doc = await journal.read();
    const latest = new Map<string, SyncEntry>();
    doc.entries.forEach((entry) => latest.set(baseKey(entry.operation.kind, entry.operation.entityId), entry));
    const candidates = Array.from(latest.values()).filter((entry) => entry.receipt.state === 'NEEDS_REVIEW' && entry.receipt.receivedAt &&
        ['RISK_DATA', 'RISK_DATA_DELETE', 'CHARACTERIZATION', 'CHARACTERIZATION_DELETE'].includes(entry.operation.kind)).slice(0, 100);
    if (!candidates.length) throw new Error('Sincronize os itens primeiro para consultar suas condições atuais.');
    const review = await client.review({ contractVersion: 1, deviceId: journal.context.deviceId, workspaceId: journal.context.workspaceId,
        operationIds: candidates.map((entry) => entry.operation.operationId), previousHead: getReviewContext(candidates[0], doc).expectedHead });
    if (review.contractVersion !== 1 || !/^[a-f0-9]{64}$/.test(review.reviewHead) || !/^[a-f0-9]{64}$/.test(review.reviewContextHash) ||
        !Array.isArray(review.items) || review.items.length !== candidates.length || new Set(review.items.map((item) => item.operationId)).size !== candidates.length) throw new Error('A consulta da revisão está incompleta. Nenhuma base foi substituída.');
    for (const item of review.items) {
        const original = candidates.find((entry) => entry.operation.operationId === item.operationId);
        if (!original || original.operation.entityId !== item.entityId || original.operation.kind !== item.kind || canonical(original.operation.payload) !== canonical(item.collectedPayload)) throw new Error('A consulta não corresponde aos itens desta visita. Reabra a revisão.');
    }
    const receipts: SyncReceipt[] = [];
    for (const item of review.items) {
        const entry = candidates.find((candidate) => candidate.operation.operationId === item.operationId)!;
        const history = ['SST_DECISION_REQUIRED', 'SST_REVISION_CONFLICT', 'SST_DECISION_PLAN_STALE', 'MOBILE_DECISION_PLAN_STALE', 'SST_STRUCTURE_ARCHIVE_REQUIRES_NEW_CONDITION'].includes(entry.receipt.error?.code || '');
        receipts.push({ ...entry.receipt, error: { ...entry.receipt.error,
            ...(history && item.baseMatches ? { code: 'SST_DECISION_REQUIRED', message: 'Confira os dados atuais e confirme o tipo e a data da alteração.', expectedHead: review.reviewHead, reviewContextHash: review.reviewContextHash } : {}),
            ...(!item.baseMatches ? { code: 'MOBILE_BASE_CONFLICT', message: 'O cadastro mudou desde a coleta. Confira os valores atuais antes de substituir os dados.', currentSnapshotHash: item.currentBaseSnapshotHash, snapshot: item.currentSnapshot } : {}),
            effectiveFrom: item.effectiveFrom || undefined,
            details: { ...entry.receipt.error?.details, expectedHead: review.reviewHead, reviewContextHash: review.reviewContextHash, effectiveFrom: item.effectiveFrom,
                currentSnapshot: item.currentSnapshot, collectedPayload: item.collectedPayload, changedFields: item.changedFields, reviewContext: review.context } } });
    }
    await journal.updateReceipts(receipts);
    await journal.updateSetting<Planning>(settingsKey, (previous) => {
        if (previous?.pendingPlan && previous.pendingPlan.operations.some((operation) => candidates.some((entry) => entry.operation.operationId === operation.supersedesOperationId))) {
            previous.abandonedPlans = [...(previous.abandonedPlans || []), previous.pendingPlan]; delete previous.pendingPlan;
        }
        return previous;
    });
}
export async function resumeVisitDecisionPlan(journal: SyncJournal, client: VisitDecisionClient) {
    const value = await journal.getSetting<Planning>(settingsKey) || empty();
    const pending = value.pendingPlan;
    if (!pending) return { captured: 0, errors: [] as { operationId: string; message: string }[] };
    try {
        const sealed = await client.createPlan(pending);
        if (sealed.planId !== pending.planId || !/^[a-f0-9]{64}$/.test(sealed.head || '') || !Array.isArray(sealed.operations) || sealed.operations.length !== pending.operations.length ||
            new Set(sealed.operations.map((operation) => operation.operationId)).size !== pending.operations.length) throw new Error('A confirmação do plano está incompleta. As escolhas continuam salvas.');
        const normalized = sealed.operations.map((operation) => {
            const original = pending.operations.find((item) => item.operationId === operation.operationId);
            if (!original || operation.decisionPlanId !== pending.planId || !operation.decision || operation.decision.expectedHead !== sealed.head) throw new Error('O plano confirmado não corresponde às escolhas desta visita.');
            const { expectedHead, ...choice } = operation.decision;
            const withoutSeal = { ...operation, decision: choice };
            delete withoutSeal.decisionPlanId;
            if (canonical(withoutSeal) !== canonical(original)) throw new Error('O conteúdo da decisão mudou durante a confirmação. Confira a visita novamente.');
            return operation;
        });
        await journal.importOperations(normalized);
        await journal.updateSetting<Planning>(settingsKey, (latest) => {
            if (latest?.pendingPlan?.planId === pending.planId) delete latest.pendingPlan;
            return latest;
        });
        return { captured: normalized.length, errors: [] as { operationId: string; message: string }[] };
    } catch (error: any) {
        return { captured: 0, errors: pending.operations.map((operation) => ({ operationId: operation.supersedesOperationId || operation.operationId,
            message: error?.message || 'As decisões estão salvas no aparelho. Tente novamente quando houver conexão.' })) };
    }
}
/** Save every choice before networking; the API seals one plan and advances its own head only. */
export async function applyReviewDecisions(journal: SyncJournal, selections: VisitSelection[], client: VisitDecisionClient) {
    if (!Array.isArray(selections) || !selections.length || selections.length > 100) throw new Error('Selecione de 1 a 100 alterações para confirmar.');
    const doc = await journal.read();
    const value = await journal.getSetting<Planning>(settingsKey) || empty();
    const errors: { operationId: string; message: string }[] = [];
    const operations: SyncOperation[] = [];
    let reviewHead: string | undefined;
    let reviewContextHash: string | undefined;
    const selected = new Set<string>();
    for (const selection of selections) {
        try {
            if (selected.has(selection.operationId)) throw new Error('Uma alteração foi selecionada mais de uma vez.');
            selected.add(selection.operationId);
            const entry = doc.entries.find((item) => item.operation.operationId === selection.operationId);
            if (!entry) throw new Error('Esta alteração não pertence à coleta atual.');
            const latest = [...doc.entries].reverse().find((item) => item.operation.kind === entry.operation.kind && item.operation.entityId === entry.operation.entityId);
            if (latest?.operation.operationId !== selection.operationId || entry.receipt.state === 'APPLIED') throw new Error('Esta alteração mudou desde a seleção. Atualize a lista antes de confirmar.');
            const context = getReviewContext(entry, doc);
            if (!context.eligible) throw new Error('Esta pendência precisa ser conferida no cadastro de origem; não pode receber uma vigência em lote.');
            if (context.reviewContextHash && reviewContextHash && (reviewContextHash !== context.reviewContextHash || reviewHead !== context.expectedHead)) throw new Error('O contexto da visita mudou. Reabra a revisão para conferir os dados atuais antes de confirmar.');
            reviewHead ||= context.expectedHead;
            reviewContextHash ||= context.reviewContextHash;
            const choice = preference(selection, true);
            if (choice.intent === 'CORRECTION' && !visitAllowsCorrection(entry.operation.kind)) throw new Error('Para encerrar um ambiente já declarado, escolha nova condição e informe desde quando ele deixou de valer. A coleta foi preservada.');
            if (choice.intent === 'CORRECTION') {
                if (context.periodStart && choice.effectiveFrom && choice.effectiveFrom !== context.periodStart) throw new Error('A correção mantém o início do período existente.');
                choice.effectiveFrom = context.periodStart || choice.effectiveFrom;
                if (!validCivilDate(choice.effectiveFrom)) throw new Error('Confirme o início do período que será corrigido.');
            }
            value.choices[selection.operationId] = choice;
            const { decision: oldDecision, operationId: oldId, decisionPlanId: oldPlan, ...draft } = entry.operation;
            operations.push({ ...draft, operationId: journal.options.id(), supersedesOperationId: oldId, decision: choice });
        } catch (error: any) { errors.push({ operationId: selection.operationId, message: error.message }); }
    }
    // The reviewed summary is a single consent. Fix invalid selections before any server mutation.
    if (errors.length) { await journal.setSetting(settingsKey, value); return { captured: 0, errors }; }
    const replacements = new Map(operations.map((operation) => [operation.supersedesOperationId!, operation.operationId]));
    operations.forEach((operation) => { if (operation.dependsOn) operation.dependsOn = operation.dependsOn.map((id) => replacements.get(id) || id); });
    const request: VisitPlanRequest = { contractVersion: 1, planId: journal.options.id(), deviceId: journal.context.deviceId, workspaceId: journal.context.workspaceId, reviewHead, reviewContextHash, operations };
    if (value.pendingPlan) {
        // A response may have been lost. Repeat the exact request instead of minting new commands.
        const old = value.pendingPlan.operations.map((operation) => ({ supersedes: operation.supersedesOperationId, decision: operation.decision }));
        const next = operations.map((operation) => ({ supersedes: operation.supersedesOperationId, decision: operation.decision }));
        if (canonical(old) === canonical(next)) return resumeVisitDecisionPlan(journal, client);
    }
    value.pendingPlan = request;
    await journal.setSetting(settingsKey, value);
    return resumeVisitDecisionPlan(journal, client);
}
