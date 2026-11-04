import { SyncContext } from './types';
import { RecoveryKind, sanitizeRecovery } from './recovery';

export const RAW_VISIT_TABLES = ['Company', 'Workspace', 'CompanyCharacterization', 'CompanyCharacterizationPhoto', 'RiskData', 'Risk', 'RecMed', 'GenerateSource', 'Hierarchy', 'Employee',
    'MMWorkspaceHierarchy', 'MMCharacterizationHierarchy', 'MMCharacterizationEmployee', 'MMGenerateToRiskData', 'MMEngsToRiskData', 'MMAdmsToRiskData', 'MMRecsToRiskData', 'MMEpisToRiskData', 'SyncOperation'] as const;
type Row = Record<string, any>;
const refs = (rows: Row[], field = 'id') => new Set(rows.map((row) => String(row[field] || '')).filter(Boolean));
const identities = (rows: Row[]) => new Set(rows.flatMap((row) => [row.id, row.apiId]).filter(Boolean).map(String));

/** Raw SQLite rows, not business DTOs: unknown fields and all EPI answers remain recoverable. */
export async function collectRawVisit(context: SyncContext, readRows: (table: string) => Promise<Row[]>, capturedAt: string) {
    const raw: Record<string, Row[]> = {}, errors: { table: string; message: string }[] = [];
    for (const table of RAW_VISIT_TABLES) {
        try { raw[table] = await readRows(table); }
        catch { raw[table] = []; errors.push({ table, message: 'Não foi possível ler esta tabela; as outras fontes foram incluídas.' }); }
    }
    const actor = (row: Row) => String(row.user_id) === String(context.userId);
    const tables: Record<string, Row[]> = {};
    tables.Company = raw.Company.filter((row) => actor(row) && [row.id, row.apiId].includes(context.companyId));
    const companies = identities(tables.Company); companies.add(context.companyId);
    tables.Workspace = raw.Workspace.filter((row) => actor(row) && [row.id, row.apiId].includes(context.workspaceId) && companies.has(row.companyId));
    const workspaces = identities(tables.Workspace); workspaces.add(context.workspaceId);
    tables.CompanyCharacterization = raw.CompanyCharacterization.filter((row) => actor(row) && workspaces.has(row.workspaceId) && (!row.companyId || companies.has(row.companyId)));
    const parents = identities(tables.CompanyCharacterization);
    tables.CompanyCharacterizationPhoto = raw.CompanyCharacterizationPhoto.filter((row) => parents.has(row.companyCharacterizationId));
    tables.RiskData = raw.RiskData.filter((row) => actor(row) && parents.has(row.characterizationId));
    const riskData = identities(tables.RiskData);
    for (const table of ['MMGenerateToRiskData', 'MMEngsToRiskData', 'MMAdmsToRiskData', 'MMRecsToRiskData', 'MMEpisToRiskData']) {
        tables[table] = raw[table].filter((row) => actor(row) && riskData.has(row.riskDataId));
    }
    tables.MMWorkspaceHierarchy = raw.MMWorkspaceHierarchy.filter((row) => workspaces.has(row.workspaceId));
    tables.MMCharacterizationHierarchy = raw.MMCharacterizationHierarchy.filter((row) => parents.has(row.characterizationId));
    tables.MMCharacterizationEmployee = raw.MMCharacterizationEmployee.filter((row) => parents.has(row.characterizationId));
    const hierarchyIds = new Set([...tables.MMWorkspaceHierarchy, ...tables.MMCharacterizationHierarchy].map((row) => row.hierarchyId));
    const employeeIds = refs(tables.MMCharacterizationEmployee, 'employeeId');
    tables.Employee = raw.Employee.filter((row) => actor(row) && companies.has(row.companyId) && (employeeIds.has(row.id) || employeeIds.has(String(row.apiId)) || hierarchyIds.has(row.hierarchyId)));
    tables.Employee.forEach((row) => { if (row.hierarchyId) hierarchyIds.add(row.hierarchyId); });
    const availableHierarchies = raw.Hierarchy.filter((row) => actor(row) && (!row.companyId || companies.has(row.companyId)));
    let added = true;
    while (added) {
        added = false;
        for (const row of availableHierarchies) if ((hierarchyIds.has(row.id) || hierarchyIds.has(row.apiId)) && row.parentId && !hierarchyIds.has(row.parentId)) { hierarchyIds.add(row.parentId); added = true; }
    }
    tables.Hierarchy = availableHierarchies.filter((row) => hierarchyIds.has(row.id) || hierarchyIds.has(row.apiId));
    const risks = refs(tables.RiskData, 'riskId');
    const recs = new Set([...tables.MMEngsToRiskData, ...tables.MMAdmsToRiskData, ...tables.MMRecsToRiskData].map((row) => row.recMedId));
    const generators = refs(tables.MMGenerateToRiskData, 'generateSourceId');
    tables.RecMed = raw.RecMed.filter((row) => actor(row) && (!row.companyId || companies.has(row.companyId)) && (risks.has(row.riskId) || recs.has(row.id) || recs.has(row.apiId)));
    tables.GenerateSource = raw.GenerateSource.filter((row) => actor(row) && (risks.has(row.riskId) || generators.has(row.id) || generators.has(row.apiId)));
    [...tables.RecMed, ...tables.GenerateSource].forEach((row) => { if (row.riskId) risks.add(row.riskId); });
    tables.Risk = raw.Risk.filter((row) => actor(row) && (!row.companyId || companies.has(row.companyId)) && (risks.has(row.id) || risks.has(row.apiId)));
    const journalKey = `mobile-sync-v1:${context.userId}:${context.companyId}:${context.workspaceId}`;
    tables.SyncOperation = raw.SyncOperation.filter((row) => row.context_key === journalKey && ['META', 'OPERATION', 'BASE', 'SETTINGS'].includes(row.record_type));
    // Keep the raw representation as well as a parsed view. A broken journal must not block rescue.
    const journalRecords = tables.SyncOperation.map((row) => {
        try { return { ...row, parsed: JSON.parse(row.data) }; }
        catch { return { ...row, parseError: true }; }
    });
    tables.SyncOperation = journalRecords;
    const document = sanitizeRecovery({ format: 'simplesst.visit.raw', version: 1, schemaVersion: 45,
        context, capturedAt, tables, readErrors: errors });
    const parseErrors: { table: string; message: string }[] = [];
    const media = findVisitMedia(document, (key) => {
        const table = key === 'data' ? 'SyncOperation.data' : `media-metadata:${key}`;
        if (!parseErrors.some((error) => error.table === table)) parseErrors.push({ table, message: 'Metadados inválidos foram preservados para recuperação; a lista de arquivos pode estar incompleta.' });
    });
    const readErrors = [...errors, ...parseErrors]; document.readErrors = readErrors;
    return { document, media, readErrors };
}

/** Deleted parents keep their serialized audio/video arrays inside original source snapshots. */
export function findVisitMedia(document: any, invalid?: (key: string) => void) {
    const files = new Map<string, { uri: string; name: string; kind: RecoveryKind; mimeType: string }>();
    const walk = (value: any, key = '', hint = '') => {
        if (typeof value === 'string' && ['audios', 'videos', 'data'].includes(key)) {
            if (!value.trim()) return;
            try { walk(JSON.parse(value), '', key === 'data' ? hint : key); }
            catch {
                invalid?.(key);
                // Salvage valid quoted URI references even from a truncated JSON array.
                const pattern = /"(uri|photoUrl)"\s*:\s*("(?:[^"\\]|\\.)*")/g;
                let match: RegExpExecArray | null;
                while ((match = pattern.exec(value))) { try { walk(JSON.parse(match[2]), match[1], key === 'data' ? hint : key); } catch { /* keep the raw source for TI */ } }
            }
        } else if (typeof value === 'string' && ['uri', 'photoUrl'].includes(key) && /^(file|content|ph):\/\//.test(value)) {
            const ext = /\.([a-z0-9]{1,8})(?:[?#].*)?$/i.exec(value)?.[1].toLowerCase() || 'bin';
            const audio = hint === 'audios' || /^(mp3|m4a|wav|aac|ogg|caf)$/.test(ext);
            const video = hint === 'videos' || /^(mp4|mov|m4v|webm)$/.test(ext);
            const photo = key === 'photoUrl' || /^(jpg|jpeg|png|heic|webp)$/.test(ext);
            const kind = audio ? 'AUDIO' : video ? 'VIDEO' : photo ? 'PHOTO' : 'OTHER';
            const mimeType = ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', aac: 'audio/aac', ogg: 'audio/ogg', caf: 'audio/x-caf', mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/mp4', webm: 'video/webm' } as Record<string, string>)[ext] || 'application/octet-stream';
            if (!files.has(value)) files.set(value, { uri: value, name: `${kind.toLowerCase()}-${files.size + 1}.${ext}`, kind, mimeType });
        } else if (Array.isArray(value)) value.forEach((item) => walk(item, '', hint));
        else if (value && typeof value === 'object') Object.entries(value).forEach(([child, item]) => {
            // META contains identity only. A broken identity row is preserved raw,
            // but cannot conceal media references as an OPERATION/BASE can.
            if (child === 'data' && value.record_type === 'META') return;
            walk(item, child, hint);
        });
    };
    walk(document); return Array.from(files.values());
}
