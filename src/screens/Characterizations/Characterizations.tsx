import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SBox, SFloatingButton, SIcon, SSpinner, SText, SVStack } from '@components/core';
import { SScreenHeader } from '@components/index';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@hooks/useAuth';
import { useSyncCharacterization } from '@hooks/useSyncCharacterization';
import { useVisitRefresh } from '@hooks/useVisitRefresh';
import { CompanyModel } from '@libs/watermelon/model/CompanyModel';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import { CompanyRepository } from '@repositories/companyRepository';
import { Alert, Keyboard, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { exportVisitArchive } from '@libs/sync/backupExport';
import RenderEnhancedCharacterizationList from './components/CharacterizationList';
import { CharacterizationsPageProps } from './types';
import { SyncJournal, archivedMedia, baseKey } from '@libs/sync/journal';
import { createSyncJournal } from '@libs/sync/storage';
import { captureVisit } from '@libs/sync/planner';
import { createSyncClient } from '@libs/sync/client';
import { runSync } from '@libs/sync/engine';
import { SyncDocument, SyncEntry, SyncSummary } from '@libs/sync/types';
import { acknowledgeMedia } from '@libs/sync/acknowledgeMedia';
import { acknowledgeSourceIds } from '@libs/sync/acknowledgeSources';
import { database } from '@libs/watermelon';
import { Q } from '@nozbe/watermelondb';
import { applyReviewDecisions, getReviewContext, loadVisitChoices, loadVisitDefaults, refreshVisitDecisionReview, resumeVisitDecisionPlan, saveVisitChoice, saveVisitDefaults, VisitPreference } from '@libs/sync/visitDecisions';
import { createVisitDecisionClient } from '@libs/sync/visitDecisionClient';
import { loadVisitRecovery, uploadVisitRecovery } from '@libs/sync/recoveryClient';
import { dateToBrazilian } from './components/VisitDateInput';
import { VisitDefaultsSheet, VisitRecoveryProgress, VisitRecoveryResult, VisitRecoverySheet, VisitReviewChoice, VisitReviewItem, VisitReviewSheet } from './components/VisitSyncSheets';
import { VisitRefreshNotice } from './components/VisitRefreshNotice';

const kindLabels: Record<string, string> = { CHARACTERIZATION: 'Ambiente / atividade', RISK_DATA: 'Risco', REC_MED: 'Medida / recomendação',
    GENERATE_SOURCE: 'Fonte geradora', SUB_OFFICE: 'Lotação', CHARACTERIZATION_DELETE: 'Encerramento de ambiente',
    RISK_DATA_DELETE: 'Remoção de risco', PHOTO_DELETE: 'Remoção de foto', FILE_DELETE: 'Remoção de arquivo', PHOTO: 'Foto', AUDIO: 'Áudio', VIDEO: 'Vídeo' };
const stateLabels: Record<string, string> = { PENDING: 'No aparelho', RETRY: 'Tentar novamente', RECEIVED: 'Recebido no servidor',
    APPLIED: 'Aplicado ao cadastro', NEEDS_REVIEW: 'Revisão necessária', WAITING_DEPENDENCY: 'Aguardando outro item' };
const fieldLabels: Record<string, string> = { name: 'Nome', description: 'Descrição', hierarchyIds: 'Cargos / setores vinculados',
    probability: 'Probabilidade', probabilityAfter: 'Probabilidade após controles', exposure: 'Exposição', activities: 'Atividades',
    generateSources: 'Fontes geradoras', adms: 'Medidas administrativas', recs: 'Recomendações', engs: 'Medidas de engenharia', epis: 'EPIs',
    temperature: 'Temperatura', luminosity: 'Luminosidade', noiseValue: 'Ruído', moisturePercentage: 'Umidade', profileName: 'Perfil', profileParentId: 'Perfil de origem', done_at: 'Conclusão',
    riskId: 'Risco', homogeneousGroupId: 'Grupo homogêneo', characterizationId: 'Ambiente / atividade', hierarchyId: 'Cargo / setor', type: 'Tipo do cadastro', startDate: 'Início da vigência', endDate: 'Fim da vigência', assessmentDetails: 'Avaliação e medição', json: 'Dados de avaliação' };
function describe(value: any, labels: Record<string, string>): string {
    if (value === null || value === undefined) return 'Não informado';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (Array.isArray(value)) return value.length ? value.map((v) => describe(v, labels)).join('; ') : 'Nenhum';
    if (typeof value === 'object') {
        if (value.epiId !== undefined || value.recMedId) return `${labels[String(value.epiId ?? value.recMedId)] || 'Item não disponível no aparelho'} — eficácia: ${describe(value.efficientlyCheck, labels)}`;
        if (Array.isArray(value.activities)) return [...value.activities.map((a: any) => [a.description, a.subActivity].filter(Boolean).join(': ')), value.realActivity].filter(Boolean).join('; ') || 'Nenhuma';
        return Object.values(value).map((v) => describe(v, labels)).join(', ');
    }
    return labels[String(value)] || ({ HP: 'Habitual e permanente', HI: 'Habitual e intermitente', O: 'Ocasional' } as Record<string, string>)[String(value)] || String(value);
}
function describeField(field: string, value: any, labels: Record<string, string>): string {
    const references = ['riskId', 'homogeneousGroupId', 'characterizationId', 'hierarchyId', 'hierarchyIds', 'profileParentId', 'generateSources', 'adms', 'recs', 'engs', 'epis'];
    // A numeric measurement/probability is never an EPI identifier, even when both happen to have the same value.
    return describe(value, references.includes(field) ? labels : {});
}

export function Characterizations({ route, navigation }: CharacterizationsPageProps): React.ReactElement {
    const insets = useSafeAreaInsets();
    const [workspaceDB, setWorkspaceDB] = useState<WorkspaceModel>();
    const [companyDB, setCompanyDB] = useState<CompanyModel>();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [summary, setSummary] = useState<SyncSummary>();
    const [pending, setPending] = useState<SyncEntry[]>([]);
    const [document, setDocument] = useState<SyncDocument>();
    const [visitPreference, setVisitPreference] = useState<VisitPreference>();
    const [visitChoices, setVisitChoices] = useState<Record<string, VisitPreference>>({});
    const [defaultsOpen, setDefaultsOpen] = useState(false);
    const [batchOpen, setBatchOpen] = useState(false);
    const [recoveryOpen, setRecoveryOpen] = useState(false);
    const [recovering, setRecovering] = useState(false);
    const [recoveryProgress, setRecoveryProgress] = useState<VisitRecoveryProgress>();
    const [recoveryResult, setRecoveryResult] = useState<VisitRecoveryResult>();
    const [recoveryError, setRecoveryError] = useState<string>();
    const recoveryRef = useRef(false);
    const newRecoveryPackage = useRef(false);
    const [review, setReview] = useState<SyncEntry>();
    const [labels, setLabels] = useState<Record<string, string>>({});
    const [exporting, setExporting] = useState(false);
    const exportRef = useRef(false);
    const journalRef = useRef<SyncJournal | undefined>(undefined);
    const busyRef = useRef(false);
    const mounted = useRef(true);
    const { user } = useAuth();
    const { syncCharacterization } = useSyncCharacterization();

    const refreshStatus = useCallback(async () => {
        const journal = journalRef.current;
        if (!journal) return;
        const doc = await journal.read();
        const names: Record<string, string> = {};
        for (const table of ['Risk', 'Hierarchy', 'RecMed', 'GenerateSource', 'CompanyCharacterization', 'MMEpisToRiskData']) {
            try {
                const rows: any[] = await database.get(table).query(Q.where('user_id', String(journal.context.userId))).fetch();
                rows.forEach((row) => { names[String(row.epiId ?? row.id)] = row.name || row.recName || row.medName || [row.description, row.ca].filter(Boolean).join(' — '); });
            } catch { /* A missing optional lookup does not prevent uploading the collection. */ }
        }
        const latest = new Map<string, SyncEntry>();
        doc.entries.forEach((entry) => latest.set(baseKey(entry.operation.kind, entry.operation.entityId), entry));
        const [preference, choices, nextSummary] = await Promise.all([loadVisitDefaults(journal), loadVisitChoices(journal), journal.summary()]);
        if (mounted.current) { setLabels(names); setDocument(doc); setVisitPreference(preference); setVisitChoices(choices); setSummary(nextSummary); setPending(Array.from(latest.values()).filter((entry) => entry.receipt.state !== 'APPLIED' && !archivedMedia(entry, doc.entries))); }
    }, []);

    const { state: visitRefresh, retry: retryVisitRefresh, continueWithoutRefresh } = useVisitRefresh({
        companyId: companyDB?.apiId || companyDB?.id,
        workspaceId: route.params.workspaceId,
        enabled: !loading && !!companyDB && !!journalRef.current,
        onRefreshed: refreshStatus,
    });
    const retryRefresh = useCallback(async () => {
        if (busyRef.current || recoveryRef.current) {
            Alert.alert('Envio em andamento', 'Aguarde o envio terminar antes de atualizar os dados da visita.');
            return;
        }
        await retryVisitRefresh();
    }, [retryVisitRefresh]);

    const synchronize = useCallback(async () => {
        if (busyRef.current || recoveryRef.current || !journalRef.current) return;
        busyRef.current = true; setBusy(true);
        try {
            const journal = journalRef.current;
            await captureVisit(journal);
            await refreshStatus();
            await resumeVisitDecisionPlan(journal, createVisitDecisionClient(journal));
            await runSync(journal, createSyncClient(journal), { onProgress: (value) => {
                if (mounted.current) setSummary(value);
            } });
            await acknowledgeSourceIds(journal);
            await acknowledgeMedia(journal);
            // New edits made during upload are captured for the next attempt, never acknowledged by an old response.
            await captureVisit(journal);
            await refreshStatus();
            const result = await journal.summary();
            if (!mounted.current) return;
            if (!result.pending && !result.review && !result.mediaPending && !result.received) {
                Alert.alert('Sincronização concluída', 'Os itens confirmados foram aplicados ao cadastro. O envio ao eSocial é acompanhado separadamente.');
            } else {
                Alert.alert('Coleta preservada', `${result.applied} item(ns) aplicado(s). ${result.received} recebido(s) com segurança no servidor. ${result.pending} ainda no aparelho.\n\nConfira abaixo os itens que precisam de revisão. Você pode tentar novamente; o que já foi confirmado não será duplicado.`);
            }
            if (companyDB) await syncCharacterization({ workspaceId: route.params.workspaceId, companyId: companyDB.apiId || companyDB.id });
        } catch (error: any) {
            Alert.alert('Não foi possível concluir', error?.message || 'Os dados continuam no aparelho. Tente sincronizar novamente quando houver conexão.');
        } finally {
            try { await refreshStatus(); } finally { busyRef.current = false; if (mounted.current) setBusy(false); }
        }
    }, [companyDB, refreshStatus, route.params.workspaceId, syncCharacterization]);

    const exportBackup = useCallback(async () => {
        if (exportRef.current) return;
        exportRef.current = true; setExporting(true);
        try {
            const journal = journalRef.current;
            if (!journal) return;
            await captureVisit(journal);
            const backup = await exportVisitArchive(await journal.read());
            if (backup.missingMedia) Alert.alert('Cópia com arquivos ausentes', `Os dados foram exportados, mas ${backup.missingMedia} arquivo(s) não foram encontrados. O ZIP identifica quais referências precisam ser recuperadas. Os demais arquivos foram incluídos.`);
            if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(backup.uri, { mimeType: 'application/zip',
                dialogTitle: 'Exportar coleta e arquivos de mídia', UTI: 'public.zip-archive' });
            else Alert.alert('Coleta exportada', `O arquivo foi salvo neste aparelho: ${backup.uri}`);
        } catch (error: any) { Alert.alert('Não foi possível exportar', error?.message || 'A coleta continua no aparelho.'); }
        finally { exportRef.current = false; if (mounted.current) setExporting(false); }
    }, []);

    const resolve = useCallback(async () => {
        if (!review || !journalRef.current) return;
        const currentHash = review.receipt.error?.currentSnapshotHash || review.receipt.error?.details?.currentSnapshotHash;
        if (currentHash) {
            await journalRef.current.capture([{ kind: review.operation.kind, entityId: review.operation.entityId,
                payload: review.operation.payload, baseSnapshotHash: currentHash,
                dependsOn: review.operation.dependsOn, supersedesOperationId: review.operation.operationId }]);
            setReview(undefined); await refreshStatus(); await synchronize(); return;
        }
        Alert.alert('Revisão necessária', 'Abra o cadastro para conferir esta pendência. A coleta original já recebida permanece disponível.');
    }, [refreshStatus, review, synchronize]);

    const savePreference = useCallback(async (value: VisitPreference | undefined) => {
        if (!journalRef.current) throw new Error('A visita ainda está carregando.');
        await saveVisitDefaults(journalRef.current, value); await refreshStatus();
    }, [refreshStatus]);
    const saveChoice = useCallback(async (operationId: string, value: VisitPreference | undefined) => {
        if (!journalRef.current) throw new Error('A visita ainda está carregando.');
        await saveVisitChoice(journalRef.current, operationId, value); await refreshStatus();
    }, [refreshStatus]);
    const refreshReview = useCallback(async () => {
        const journal = journalRef.current;
        if (!journal || busyRef.current || recoveryRef.current) throw new Error('Aguarde o envio em andamento antes de atualizar a revisão.');
        await refreshVisitDecisionReview(journal, createVisitDecisionClient(journal)); await refreshStatus();
    }, [refreshStatus]);
    const confirmChoices = useCallback(async (choices: VisitReviewChoice[]) => {
        const journal = journalRef.current;
        if (!journal || busyRef.current || recoveryRef.current) throw new Error('Aguarde o envio em andamento e tente novamente.');
        const result = await applyReviewDecisions(journal, choices, createVisitDecisionClient(journal));
        await refreshStatus();
        if (result.errors.length) throw new Error(result.errors[0].message + (result.errors.length > 1 ? `\n${result.errors.length} alteração(ões) continuam pendentes.` : ''));
        await synchronize();
    }, [refreshStatus, synchronize]);
    const startRecovery = useCallback(async (details: string) => {
        if (busyRef.current || recoveryRef.current || !journalRef.current) return;
        recoveryRef.current = true; setRecovering(true); setRecoveryError(undefined); setRecoveryResult(undefined);
        try {
            const reasonCode = summary && (summary.pending || summary.review || summary.mediaPending) ? 'SYNC_FAILURE' as const : 'MANUAL_RESCUE' as const;
            const result = await uploadVisitRecovery(journalRef.current, { reasonCode, details, newPackage: newRecoveryPackage.current,
                onProgress: (progress: VisitRecoveryProgress) => { if (progress.recoveryId) newRecoveryPackage.current = false; if (mounted.current) setRecoveryProgress(progress); } });
            newRecoveryPackage.current = false;
            if (mounted.current) setRecoveryResult(result);
        } catch (error: any) { if (mounted.current) setRecoveryError(error?.message || 'Não foi possível concluir. A coleta permanece no aparelho.'); }
        finally { recoveryRef.current = false; if (mounted.current) setRecovering(false); }
    }, [summary]);
    const reviewItems: VisitReviewItem[] = pending.filter((entry) => entry.receipt.state === 'NEEDS_REVIEW').map((entry) => {
        const context = getReviewContext(entry, document);
        const parentId = entry.operation.payload.homogeneousGroupId || entry.operation.payload.characterizationId;
        const details = entry.receipt.error?.details;
        const currentContext = details?.reviewContext;
        const count = (value: any) => Array.isArray(value) ? value.length : typeof value === 'number' ? value : undefined;
        const contextParts = currentContext ? [[count(currentContext.protectedDeclarations), 'envio(s) protegido(s)'], [count(currentContext.activeEmployments), 'vínculo(s) ativo(s)'],
            [count(currentContext.assignments), 'lotação(ões)'], [count(currentContext.links), 'relação(ões) do cadastro']].filter(([value]) => value !== undefined).map(([value, text]) => `${value} ${text}`) : [];
        const changes = Array.isArray(details?.changedFields) ? details.changedFields.map((change: any) => ({ label: fieldLabels[change.field] || 'Informação do cadastro',
            collected: describeField(change.field, change.collectedValue, labels), current: describeField(change.field, change.currentValue, labels) })) : undefined;
        return { entry, label: `${kindLabels[entry.operation.kind]}${entry.operation.payload.name || labels[entry.operation.payload.riskId || entry.operation.entityId] ? `: ${entry.operation.payload.name || labels[entry.operation.payload.riskId || entry.operation.entityId]}` : ''}`,
            subtitle: parentId && labels[parentId] || undefined, eligible: context.eligible, periodStart: context.periodStart, errorMessage: entry.receipt.error?.message,
            changes, contextSummary: contextParts.join(' · '), contextChanged: currentContext?.contextChanged === true };
    });
    const historyReviewCount = reviewItems.filter((item) => item.eligible).length;
    const openSource = (item: VisitReviewItem) => {
        const entry = item.entry;
        const parentId = entry.operation.kind === 'CHARACTERIZATION' ? entry.operation.entityId : entry.operation.payload.homogeneousGroupId || entry.operation.payload.characterizationId;
        if (!parentId) { Alert.alert('Cadastro de origem', 'Volte à lista e abra o ambiente ou atividade desta coleta para conferir a pendência.'); return; }
        setBatchOpen(false); navigation.navigate('characterization', { id: parentId, workspaceId: route.params.workspaceId });
    };

    useEffect(() => {
        mounted.current = true;
        (async () => {
            try {
                const { workspace } = await new CompanyRepository().findOneWorkspace(route.params.workspaceId);
                const company = await (workspace.Company as any).fetch() as CompanyModel;
                journalRef.current = await createSyncJournal({ userId: user.id, companyId: company.apiId || company.id, workspaceId: workspace.id });
                if (mounted.current) { setWorkspaceDB(workspace); setCompanyDB(company); }
                try { const recovery = await loadVisitRecovery(journalRef.current); if (mounted.current && recovery) setRecoveryResult(recovery); } catch { /* A damaged recovery receipt must not block the saved visit. */ }
                await captureVisit(journalRef.current);
                await refreshStatus();
            } catch (error: any) { Alert.alert('Coleta mantida no aparelho', error?.message || 'Não foi possível atualizar a lista. Tente novamente.'); }
            finally { if (mounted.current) setLoading(false); }
        })();
        return () => { mounted.current = false; };
    }, [refreshStatus, route.params.workspaceId, user.id]);

    return <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}><SVStack flex={1}>
        <SScreenHeader mb={4} backButton title="Ambientes / Atividades" subtitleComponent={<SBox px={12}>
            <SText fontSize={14} color="text.label">{companyDB?.fantasy || companyDB?.name || ''} ({workspaceDB?.name || ''})</SText>
        </SBox>} />
        {loading ? <SSpinner color="primary.main" size={32} mt={29} /> : <>
            <RenderEnhancedCharacterizationList workspace={workspaceDB} listHeader={<>
            {!!companyDB && !!journalRef.current && <VisitRefreshNotice visitKey={`${user.id}:${route.params.workspaceId}`} phase={visitRefresh.phase}
                lastSuccessfulAt={visitRefresh.lastSuccessfulAt} hasLocalSnapshot={visitRefresh.hasLocalSnapshot}
                retryDisabled={busy || recovering} onRetry={retryRefresh} onContinue={continueWithoutRefresh} />}
            <View style={styles.status}>
                <Text style={styles.title}>Sincronização da visita</Text>
                <Text style={styles.copy}>{busy ? 'Enviando os itens que puderem ser confirmados…' : `${summary?.applied || 0} aplicado(s) · ${summary?.received || 0} recebido(s) no servidor · ${summary?.pending || 0} no aparelho`}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Configurar data padrão da visita" onPress={() => setDefaultsOpen(true)} style={styles.visitDate}>
                    <View style={styles.grow}><Text style={styles.visitDateLabel}>OPÇÃO COMUM DESTA VISITA</Text><Text style={styles.visitDateText}>{visitPreference ? visitPreference.intent === 'CORRECTION' ? 'Corrigir os períodos existentes' : dateToBrazilian(visitPreference.effectiveFrom) : 'Definir data e motivo (opcional)'}</Text>
                        {!!visitPreference && <Text numberOfLines={2} style={styles.hint}>{visitPreference.intent === 'NEW_CONDITION' ? 'Nova condição' : 'Correção'} · {visitPreference.reason}</Text>}</View><Text style={styles.visitDateAction}>{visitPreference ? 'Alterar' : 'Definir'}</Text>
                </TouchableOpacity>
                {reviewItems.length > 0 && <TouchableOpacity accessibilityRole="button" onPress={() => setBatchOpen(true)} style={styles.reviewBatch}><Text style={styles.buttonText}>{historyReviewCount ? `Revisar ${historyReviewCount} alteração(ões) em conjunto` : `Conferir ${reviewItems.length} pendência(s)`}</Text><Text style={styles.reviewBatchHint}>{historyReviewCount ? 'Uma data comum, com exceções por item.' : 'Confira os dados e atualize a revisão quando necessário.'}</Text></TouchableOpacity>}
                <View style={styles.actions}><TouchableOpacity accessibilityRole="button" disabled={busy || recovering} onPress={synchronize} style={[styles.button, (busy || recovering) && styles.disabled]}>
                    <Text style={styles.buttonText}>{busy ? 'Sincronizando…' : 'Sincronizar / tentar pendentes'}</Text>
                </TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={() => setRecoveryOpen(true)} style={styles.secondary}><Text style={styles.secondaryText}>{recovering ? 'Ver recuperação em andamento' : 'Preciso de ajuda para enviar'}</Text></TouchableOpacity></View>
                <Text style={styles.hint}>Falhas em um item não impedem os demais. Antes do primeiro envio ao eSocial, o cadastro continua normal.</Text>
                {pending.length > 0 && <ScrollView style={styles.pending} nestedScrollEnabled>
                    {pending.map((entry) => <TouchableOpacity key={entry.operation.operationId} accessibilityRole="button" style={styles.item} onPress={() => {
                        if (entry.receipt.state === 'NEEDS_REVIEW') { if (getReviewContext(entry, document).eligible) setBatchOpen(true); else setReview(entry); }
                        else Alert.alert(stateLabels[entry.receipt.state], entry.receipt.error?.message || 'Este item permanece preservado. Use sincronizar para tentar novamente.');
                    }}><Text style={styles.itemTitle}>{kindLabels[entry.operation.kind]}{entry.operation.payload.name || labels[entry.operation.payload.riskId || entry.operation.entityId] ? `: ${entry.operation.payload.name || labels[entry.operation.payload.riskId || entry.operation.entityId]}` : ''}</Text>
                        <Text style={styles.hint}>{stateLabels[entry.receipt.state]}{entry.receipt.durable ? ' · arquivo preservado no servidor' : ''}</Text>
                        {!!entry.receipt.error?.message && <Text style={styles.error}>{entry.receipt.error.message}</Text>}
                    </TouchableOpacity>)}
                </ScrollView>}
            </View>
            </>} />
            <SFloatingButton renderInPortal={false} shadow={2} placement="bottom-right" size="md" mr={130} bg="background.default" borderColor="primary.main" borderWidth={1}
                _text={{ color: 'primary.main' }} icon={<SIcon color="primary.main" as={Ionicons} name="cloud-upload-outline" size="4" />}
                label="Enviar" bottom={`${insets.bottom + 16}px`} onPress={synchronize} />
        </>}
        <Modal visible={!!review} transparent animationType="slide" onRequestClose={() => setReview(undefined)}>
            <View style={styles.overlay}><View style={styles.dialog}><ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Revisar esta alteração</Text>
                <Text style={styles.copy}>{review?.receipt.error?.message || 'A coleta está preservada. Informe como esta alteração deve entrar no histórico.'}</Text>
                {!!(review?.receipt.error?.currentSnapshotHash || review?.receipt.error?.details?.currentSnapshotHash) && <View>
                    <Text style={styles.label}>Confira antes de aplicar a coleta</Text>
                    {Object.entries(review?.operation.payload || {}).filter(([key]) => !['id', 'sourceSnapshot', 'riskId', 'hierarchyId', 'homogeneousGroupId'].includes(key)).map(([key, value]) => <View key={key} style={styles.item}>
                        <Text style={styles.itemTitle}>{fieldLabels[key] || 'Informação do cadastro'}</Text><Text style={styles.copy}>Sua coleta: {describeField(key, value, labels)}</Text>
                        <Text style={styles.hint}>Cadastro atual: {describeField(key, (review?.receipt.error?.snapshot || review?.receipt.error?.details?.snapshot || {})[key], labels)}</Text>
                    </View>)}
                    <Text style={styles.hint}>Confirmar cria uma nova proposta com a base que você acabou de conferir. A API verifica novamente e pode pedir a decisão sobre o histórico.</Text>
                </View>}
                <Text style={styles.hint}>A versão anterior e a coleta original continuam preservadas. A API confere a versão antes de aplicar.</Text>
                <TouchableOpacity style={styles.secondary} onPress={() => {
                    const parentId = review?.operation.kind === 'CHARACTERIZATION' ? review.operation.entityId : review?.operation.payload.homogeneousGroupId || review?.operation.payload.characterizationId;
                    if (!parentId) { Alert.alert('Cadastro de origem', 'Volte à lista e abra o ambiente ou atividade desta coleta para corrigir o dado.'); return; }
                    setReview(undefined); navigation.navigate('characterization', { id: parentId, workspaceId: route.params.workspaceId });
                }}><Text style={styles.secondaryText}>Abrir cadastro de origem</Text></TouchableOpacity>
                <View style={styles.actions}><TouchableOpacity onPress={() => setReview(undefined)} style={styles.secondary}><Text style={styles.secondaryText}>Voltar</Text></TouchableOpacity>
                    {!!(review?.receipt.error?.currentSnapshotHash || review?.receipt.error?.details?.currentSnapshotHash) && <TouchableOpacity onPress={() => resolve().catch((e) => Alert.alert('Não foi possível aplicar', e.message))} style={styles.button}><Text style={styles.buttonText}>Confirmar e sincronizar</Text></TouchableOpacity>}</View>
            </ScrollView></View></View>
        </Modal>
        <VisitDefaultsSheet visible={defaultsOpen} preference={visitPreference} onClose={() => setDefaultsOpen(false)} onSave={savePreference} />
        <VisitReviewSheet visible={batchOpen} items={reviewItems} preference={visitPreference} initialChoices={visitChoices} onClose={() => setBatchOpen(false)} onSavePreference={savePreference} onSaveChoice={saveChoice} onConfirm={confirmChoices} onOpenSource={openSource} onRefreshReview={refreshReview} />
        <VisitRecoverySheet visible={recoveryOpen} busy={recovering} progress={recoveryProgress} result={recoveryResult} error={recoveryError} onClose={() => setRecoveryOpen(false)} onStart={(details) => void startRecovery(details)} onExport={() => { if (!exporting) void exportBackup(); }} onNewCopy={() => { newRecoveryPackage.current = true; setRecoveryResult(undefined); setRecoveryProgress(undefined); setRecoveryError(undefined); }} />
    </SVStack></TouchableWithoutFeedback>;
}
const styles = StyleSheet.create({
    status: { marginHorizontal: 16, marginBottom: 12, padding: 14, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, backgroundColor: '#f8fafc' },
    title: { fontSize: 16, fontWeight: '700', color: '#16324f', marginBottom: 10 }, copy: { fontSize: 14, lineHeight: 20, color: '#334155', marginBottom: 10 },
    hint: { fontSize: 12, lineHeight: 18, color: '#64748b' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, marginBottom: 6 },
    button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#254b70', borderRadius: 6 }, buttonText: { fontSize: 13, color: '#fff', fontWeight: '600' },
    secondary: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 10 }, secondaryText: { color: '#254b70', fontSize: 13 },
    pending: { maxHeight: 156, marginTop: 8 }, item: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' }, itemTitle: { fontSize: 13, color: '#334155', fontWeight: '600', marginBottom: 4 },
    error: { fontSize: 12, color: '#9a3412', lineHeight: 17, marginTop: 4 }, overlay: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 18 },
    dialog: { backgroundColor: '#fff', borderRadius: 12, padding: 20, maxHeight: '85%' },
    label: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8, color: '#334155' },
    grow: { flex: 1 }, disabled: { opacity: 0.5 }, visitDate: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#d2e0ec', borderRadius: 10, backgroundColor: '#f4f8fc', marginBottom: 6 },
    visitDateLabel: { color: '#61788d', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }, visitDateText: { color: '#254b70', fontSize: 14, fontWeight: '600', marginTop: 5 }, visitDateAction: { color: '#285c89', fontSize: 13, fontWeight: '600', minHeight: 44, textAlignVertical: 'center', paddingVertical: 13 },
    reviewBatch: { backgroundColor: '#254b70', borderRadius: 10, padding: 14, marginTop: 9, minHeight: 66 }, reviewBatchHint: { color: '#dbe7f1', fontSize: 12, marginTop: 4 },
});
