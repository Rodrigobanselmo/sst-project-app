import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { SyncEntry } from '@libs/sync/types';
import { VisitPreference, visitAllowsCorrection } from '@libs/sync/visitDecisions';
import { brazilianToDate, dateToBrazilian, todayDate, VisitDateInput } from './VisitDateInput';
import { selectVisitBatch, toggleVisitSelection, VISIT_REVIEW_BATCH_LIMIT } from './visitReviewSelection';

export interface VisitReviewItem {
    entry: SyncEntry;
    label: string;
    subtitle?: string;
    eligible: boolean;
    periodStart?: string;
    errorMessage?: string;
    changes?: { label: string; collected: string; current: string }[];
    contextSummary?: string;
    contextChanged?: boolean;
}
export type VisitReviewChoice = VisitPreference & { operationId: string };
export interface VisitRecoveryProgress {
    recoveryId?: string;
    phase: 'PREPARING' | 'UPLOADING' | 'VERIFYING' | 'COMPLETE';
    completedFiles?: number;
    totalFiles?: number;
    uploadedBytes?: number;
    totalBytes?: number;
}
export interface VisitRecoveryResult { recoveryId: string; complete: boolean; receivedAt?: string; fileCount?: number; preparedAt?: string; missingFiles?: string[]; failedFiles?: number }

function Action({ children, onPress, secondary = false, disabled = false, label }: {
    children: ReactNode; onPress(): void; secondary?: boolean; disabled?: boolean; label?: string;
}) {
    return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
        disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondaryButton, disabled && styles.disabled]}>
        <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{children}</Text>
    </TouchableOpacity>;
}
function Sheet({ visible, title, subtitle, onClose, children, footer }: {
    visible: boolean; title: string; subtitle?: string; onClose(): void; children: ReactNode; footer?: ReactNode;
}) {
    return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Voltar" style={styles.backButton} onPress={onClose}><Text style={styles.backText}>‹</Text></TouchableOpacity>
                <View style={styles.flex}><Text style={styles.headerTitle}>{title}</Text>{!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}</View>
            </View>
            {children}
            {!!footer && <View style={styles.footer}>{footer}</View>}
        </KeyboardAvoidingView></SafeAreaView>
    </Modal>;
}
function Notice({ children }: { children: ReactNode }) { return <View style={styles.notice}><Text style={styles.noticeText}>{children}</Text></View>; }

function PreferenceFields({ value, onChange, periodStart, perItem = false, newConditionOnly = false }: {
    value: VisitPreference; onChange(value: VisitPreference): void; periodStart?: string; perItem?: boolean; newConditionOnly?: boolean;
}) {
    const [dateText, setDateText] = useState(dateToBrazilian(value.effectiveFrom));
    useEffect(() => { if (value.effectiveFrom) setDateText(dateToBrazilian(value.effectiveFrom)); }, [value.effectiveFrom]);
    return <View>
        {(['NEW_CONDITION', 'CORRECTION'] as const).map((intent) => <TouchableOpacity key={intent} accessibilityRole="radio"
            accessibilityState={{ checked: value.intent === intent, disabled: newConditionOnly && intent === 'CORRECTION' }} disabled={newConditionOnly && intent === 'CORRECTION'} onPress={() => {
                const effectiveFrom = value.intent === intent ? value.effectiveFrom : intent === 'CORRECTION' ? (perItem ? periodStart : undefined) : todayDate();
                onChange({ ...value, intent, effectiveFrom }); setDateText(dateToBrazilian(effectiveFrom));
            }} style={[styles.choice, value.intent === intent && styles.choiceSelected, newConditionOnly && intent === 'CORRECTION' && styles.disabled]}>
            <View style={[styles.radio, value.intent === intent && styles.radioSelected]}><Text style={styles.radioText}>{value.intent === intent ? '●' : ''}</Text></View>
            <View style={styles.flex}><Text style={styles.choiceTitle}>{intent === 'NEW_CONDITION' ? 'Nova condição' : 'Corrigir informações'}</Text>
                <Text style={styles.helper}>{intent === 'NEW_CONDITION' ? 'As condições mudaram a partir de uma data. Preserva o período anterior.' : 'A informação daquele período estava incorreta. Mantém o início de cada período.'}</Text></View>
        </TouchableOpacity>)}
        {newConditionOnly && <Notice>Encerrar um ambiente preserva o cadastro e fecha suas participações a partir da data informada. Escolha nova condição; corrigir informações não encerra o ambiente.</Notice>}
        {value.intent === 'NEW_CONDITION' ? <>
            <VisitDateInput label="Desde quando as novas condições valem?" value={dateText} onChange={(text) => {
                setDateText(text); onChange({ ...value, effectiveFrom: brazilianToDate(text) });
            }} />
            <Text style={styles.helper}>A data em que as condições mudaram pode ser diferente da data da visita.</Text>
        </> : perItem ? <>
            {periodStart ? <><Text style={styles.label}>Início do período que será corrigido</Text><View style={styles.lockedField}><Text style={styles.lockedText}>{dateToBrazilian(periodStart)} · mantido</Text></View>
                <Text style={styles.helper}>Corrigir o conteúdo não muda a data de início deste período.</Text></> : <>
                <VisitDateInput label="Confirme o início do período que está corrigindo" value={dateText} onChange={(text) => {
                    setDateText(text); onChange({ ...value, effectiveFrom: brazilianToDate(text) });
                }} /><Text style={styles.helper}>Não foi possível obter esta data automaticamente. Confira o período deste item antes de confirmar.</Text>
            </>}
        </> : <Notice>Cada correção preserva o início do seu próprio período. Se faltar essa informação, o app pede a confirmação apenas daquele item.</Notice>}
        <Text style={styles.label}>{perItem ? 'Motivo desta alteração' : 'Motivo comum'}</Text>
        <TextInput testID="visit-preference-reason" accessibilityLabel={perItem ? 'Motivo desta alteração' : 'Motivo comum'} value={value.reason} onChangeText={(reason) => onChange({ ...value, reason })}
            maxLength={1000} placeholder="Ex.: revisão anual das condições de trabalho" placeholderTextColor="#718299" multiline style={[styles.input, styles.multiline]} />
    </View>;
}
function preferenceValid(value: VisitPreference, item?: VisitReviewItem): boolean {
    if (item && value.intent === 'CORRECTION' && !visitAllowsCorrection(item.entry.operation.kind)) return false;
    return !!value.reason.trim() && (value.intent === 'NEW_CONDITION' ? !!brazilianToDate(dateToBrazilian(value.effectiveFrom)) :
        !item || !!item.periodStart || !!brazilianToDate(dateToBrazilian(value.effectiveFrom)));
}

export function VisitDefaultsSheet({ visible, preference, onClose, onSave }: {
    visible: boolean; preference?: VisitPreference; onClose(): void; onSave(value: VisitPreference | undefined): Promise<void>;
}) {
    const [value, setValue] = useState<VisitPreference>({ intent: 'NEW_CONDITION', effectiveFrom: todayDate(), reason: '' });
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (visible) setValue(preference || { intent: 'NEW_CONDITION', effectiveFrom: todayDate(), reason: '' });
        // A receipt arriving during sync must not replace what is being typed in this form.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);
    const save = async (next: VisitPreference | undefined) => {
        if (next && !preferenceValid(next)) { Alert.alert('Confira os campos', 'Informe o motivo e uma data válida para a nova condição.'); return; }
        setSaving(true);
        try { await onSave(next); onClose(); } catch (error: any) { Alert.alert('Não foi possível salvar', error?.message || 'Tente novamente.'); } finally { setSaving(false); }
    };
    return <Sheet visible={visible} title="Data da visita" onClose={onClose} footer={<Action disabled={saving} onPress={() => void save(value)}>{saving ? 'Salvando…' : 'Salvar padrão da visita'}</Action>}>
        <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={styles.eyebrow}>PREENCHA UMA VEZ</Text><Text style={styles.pageTitle}>Como entram as mudanças desta visita?</Text>
            <Text style={styles.copy}>Use uma opção comum. Depois você pode mudar a data ou o tipo de uma alteração específica.</Text>
            <PreferenceFields value={value} onChange={setValue} />
            <Notice>Esse padrão fica salvo neste aparelho para esta visita. Ele é uma sugestão: confira as alterações selecionadas antes de aplicar.</Notice>
            <Text style={styles.helper}>Antes do primeiro envio ao eSocial, o cadastro continua normal, sem uma exigência extra de vigência.</Text>
            {!!preference && <Action secondary disabled={saving} onPress={() => void save(undefined)}>Remover padrão da visita</Action>}
        </ScrollView>
    </Sheet>;
}

export function VisitReviewSheet({ visible, items, preference, initialChoices, onClose, onSavePreference, onSaveChoice, onConfirm, onOpenSource, onRefreshReview }: {
    visible: boolean; items: VisitReviewItem[]; preference?: VisitPreference; initialChoices?: Record<string, VisitPreference>;
    onClose(): void; onSavePreference(value: VisitPreference | undefined): Promise<void>;
    onSaveChoice(operationId: string, value: VisitPreference | undefined): Promise<void>;
    onConfirm(choices: VisitReviewChoice[]): Promise<void>; onOpenSource(item: VisitReviewItem): void; onRefreshReview?(): Promise<void>;
}) {
    const [stage, setStage] = useState<'LIST' | 'COMMON' | 'ITEM' | 'SUMMARY'>('LIST');
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [common, setCommon] = useState<VisitPreference>({ intent: 'NEW_CONDITION', effectiveFrom: todayDate(), reason: '' });
    const [exceptions, setExceptions] = useState<Record<string, VisitPreference>>({});
    const [editing, setEditing] = useState<VisitReviewItem>();
    const [editingChoice, setEditingChoice] = useState<VisitPreference>();
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [refreshingReview, setRefreshingReview] = useState(false);
    const [refreshedReview, setRefreshedReview] = useState(false);
    const [expandedChanges, setExpandedChanges] = useState<Record<string, boolean>>({});
    const [remember, setRemember] = useState(true);
    const eligible = useMemo(() => items.filter((item) => item.eligible), [items]);
    useEffect(() => {
        if (!visible) return;
        setStage('LIST'); setSearch(''); setRemember(true); setRefreshedReview(false); setExpandedChanges({});
        setSelected(selectVisitBatch(items));
        setCommon(preference || { intent: 'NEW_CONDITION', effectiveFrom: todayDate(), reason: '' });
        setExceptions(initialChoices || {});
        // Reopening starts a fresh selection; receipt refreshes must not erase an in-progress choice.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);
    const chosenItems = eligible.filter((item) => selected[item.entry.operation.operationId]);
    const choiceFor = (item: VisitReviewItem): VisitPreference => {
        const choice = exceptions[item.entry.operation.operationId] || common;
        return choice.intent === 'CORRECTION' ? { ...choice, effectiveFrom: item.periodStart || (exceptions[item.entry.operation.operationId]?.effectiveFrom) } : choice;
    };
    const chosen = chosenItems.map((item) => ({ operationId: item.entry.operation.operationId, ...choiceFor(item) }));
    const invalid = chosenItems.filter((item) => !preferenceValid(choiceFor(item), item));
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    const filtered = items.filter((item) => !normalizedSearch || `${item.label} ${item.subtitle || ''}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch));
    const groups = useMemo(() => {
        const result: Record<string, { value: VisitPreference; labels: string[] }> = {};
        chosenItems.forEach((item) => {
            const value = choiceFor(item);
            const key = JSON.stringify([value.intent, value.effectiveFrom, value.reason]);
            if (!result[key]) result[key] = { value, labels: [] };
            result[key].labels.push(item.label);
        });
        return Object.values(result);
        // The current selection/defaults/overrides are the whole derivation.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected, common, exceptions, items]);
    const edit = (item: VisitReviewItem) => { setEditing(item); setEditingChoice(choiceFor(item)); setStage('ITEM'); };
    const back = () => {
        if (saving || refreshingReview) return;
        if (stage === 'LIST') onClose(); else setStage('LIST');
    };
    const prepareSummary = () => {
        if (!chosen.length) { Alert.alert('Selecione as alterações', 'Marque os itens que deseja revisar em conjunto.'); return; }
        if (!preferenceValid(common) && chosenItems.some((item) => !exceptions[item.entry.operation.operationId])) { setStage('COMMON'); return; }
        if (invalid.length) { edit(invalid[0]); return; }
        setStage('SUMMARY');
    };
    const confirm = async () => {
        if (saving || !chosen.length || invalid.length) return;
        setSaving(true);
        try { await onConfirm(chosen); onClose(); } catch (error: any) { Alert.alert('Decisões preservadas', error?.message || 'Não foi possível concluir. Tente novamente quando houver conexão.'); }
        finally { setSaving(false); }
    };
    const footer = stage === 'LIST' ? eligible.length ? <><Text style={styles.footerHint}>{chosen.length} selecionada(s) · {chosenItems.filter((item) => !!exceptions[item.entry.operation.operationId]).length} com exceção{eligible.length > VISIT_REVIEW_BATCH_LIMIT ? ` · até ${VISIT_REVIEW_BATCH_LIMIT} por lote` : ''}</Text>
        <Action disabled={!chosen.length} onPress={prepareSummary}>{`Conferir ${chosen.length} alteração(ões)`}</Action></> : <Action secondary onPress={onClose}>Voltar às atividades</Action> : stage === 'COMMON' ? <Action onPress={() => {
            if (!preferenceValid(common)) { Alert.alert('Confira os campos', 'Informe o motivo e uma data válida para a nova condição.'); return; }
            if (remember) { setSaving(true); onSavePreference(common).then(() => setStage('LIST')).catch((e) => Alert.alert('Não foi possível salvar', e.message)).finally(() => setSaving(false)); }
            else setStage('LIST');
        }} disabled={saving}>{saving ? 'Salvando…' : 'Usar para os selecionados'}</Action> : stage === 'ITEM' ? <Action disabled={saving} onPress={() => {
            if (!editing || !editingChoice || !preferenceValid(editingChoice, editing)) { Alert.alert('Confira os campos', 'Informe o motivo e uma data válida para este item.'); return; }
            const choice = { ...editingChoice, effectiveFrom: editingChoice.intent === 'CORRECTION' ? editing.periodStart || editingChoice.effectiveFrom : editingChoice.effectiveFrom };
            setSaving(true); onSaveChoice(editing.entry.operation.operationId, choice).then(() => {
                setExceptions((old) => ({ ...old, [editing.entry.operation.operationId]: choice })); setStage('LIST');
            }).catch((error) => Alert.alert('Não foi possível salvar a exceção', error?.message || 'Os campos continuam nesta tela.')).finally(() => setSaving(false));
        }}>{saving ? 'Salvando…' : 'Salvar exceção'}</Action> : <><Action disabled={saving} onPress={() => void confirm()}>{saving ? 'Preparando e sincronizando…' : 'Confirmar e sincronizar'}</Action><Action secondary disabled={saving} onPress={() => setStage('LIST')}>Voltar para seleção</Action></>;
    return <Sheet visible={visible} title={stage === 'LIST' ? 'Revisar alterações' : stage === 'COMMON' ? 'Opção comum' : stage === 'ITEM' ? 'Ajustar esta alteração' : 'Conferir alterações'}
        subtitle={stage === 'LIST' ? `${eligible.length} alteração(ões) com revisão de vigência` : stage === 'ITEM' ? editing?.label : undefined} onClose={back} footer={footer}>
        {stage === 'LIST' ? <FlatList data={filtered} keyExtractor={(item) => item.entry.operation.operationId} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
            ListHeaderComponent={<>
                {eligible.length > 0 && <View style={styles.dateCard}><View style={styles.line}><Text style={styles.eyebrow}>PADRÃO PARA OS SELECIONADOS</Text><TouchableOpacity accessibilityRole="button" onPress={() => setStage('COMMON')} style={styles.linkButton}><Text style={styles.link}>Alterar</Text></TouchableOpacity></View>
                    <Text style={styles.dateTitle}>{common.intent === 'CORRECTION' ? 'Corrigir cada período' : dateToBrazilian(common.effectiveFrom) || 'Definir data'}</Text>
                    <Text style={styles.helper}>{common.intent === 'NEW_CONDITION' ? 'Nova condição' : 'Correção'} · {common.reason || 'Defina um motivo comum'}</Text>
                </View>}
                <TextInput accessibilityLabel="Buscar alterações da visita" value={search} onChangeText={setSearch} placeholder="Buscar ambiente, atividade ou risco" placeholderTextColor="#718299" style={[styles.input, styles.search]} />
                {!!onRefreshReview && <Action secondary disabled={refreshingReview || saving} onPress={() => {
                    setSelected({}); setRefreshingReview(true); setRefreshedReview(false);
                    onRefreshReview().then(() => { setSelected({}); setRefreshedReview(true); }).catch((error) => Alert.alert('Não foi possível atualizar a conferência', error?.message || 'As escolhas e a coleta continuam preservadas.')).finally(() => setRefreshingReview(false));
                }}>{refreshingReview ? 'Atualizando dados do servidor…' : 'Atualizar dados do servidor'}</Action>}
                {refreshedReview && <Notice>Confira as comparações entre a coleta e os dados atuais do servidor. Selecione novamente os itens que deseja aplicar; as opções de data continuam disponíveis.</Notice>}
                {eligible.length > 0 && <View style={styles.toolbar}><TouchableOpacity accessibilityRole="button" disabled={refreshingReview} onPress={() => setSelected((old) => selectVisitBatch(filtered, old))} style={styles.linkButton}>
                    <Text style={styles.link}>{normalizedSearch ? 'Selecionar resultados' : eligible.length > VISIT_REVIEW_BATCH_LIMIT ? `Selecionar próximas ${VISIT_REVIEW_BATCH_LIMIT}` : 'Selecionar todas'}</Text></TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" disabled={refreshingReview} onPress={() => setSelected({})} style={styles.linkButton}><Text style={styles.link}>Limpar seleção</Text></TouchableOpacity></View>}
                {eligible.length > VISIT_REVIEW_BATCH_LIMIT && <Text style={[styles.helper, styles.listHint]}>Confira até {VISIT_REVIEW_BATCH_LIMIT} alterações por vez. As demais continuam na lista; o padrão da visita pode ser reutilizado sem digitar a data novamente.</Text>}
                {!eligible.length && <Notice>Não há revisão de vigência neste momento. Falhas de conexão, arquivos ou diferenças com o servidor precisam de outro tratamento.</Notice>}
            </>}
            renderItem={({ item }) => {
                const choice = choiceFor(item); const id = item.entry.operation.operationId;
                return <View style={styles.reviewRow}><TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={`Selecionar ${item.label}`} accessibilityState={{ checked: !!selected[id], disabled: !item.eligible || refreshingReview }} disabled={!item.eligible || refreshingReview}
                    onPress={() => {
                        const next = toggleVisitSelection(selected, id);
                        if (next.limitReached) Alert.alert('Até 100 alterações por lote', 'Desmarque um item para escolher outro. As demais alterações continuam preservadas para o próximo lote, com o mesmo padrão de data disponível.');
                        else setSelected(next.selected);
                    }} style={styles.checkboxTouch}><View style={[styles.checkbox, selected[id] && styles.checkboxSelected, !item.eligible && styles.disabled]}><Text style={styles.checkmark}>{selected[id] ? '✓' : ''}</Text></View></TouchableOpacity>
                    <View style={styles.flex}><Text style={styles.itemTitle}>{item.label}</Text>{!!item.subtitle && <Text style={styles.helper}>{item.subtitle}</Text>}
                        {item.eligible && !visitAllowsCorrection(item.entry.operation.kind) && choice.intent === 'CORRECTION' && <Text style={styles.warningText}>O encerramento exige nova condição com a data em que deixou de valer. Ajuste este item.</Text>}
                        {item.eligible ? <Text style={[styles.dateTag, exceptions[id] && styles.exceptionTag]}>{exceptions[id] ? 'Exceção' : 'Padrão'} · {choice.intent === 'CORRECTION' ? `corrigir ${dateToBrazilian(choice.effectiveFrom) || 'período a conferir'}` : dateToBrazilian(choice.effectiveFrom) || 'defina a data'}</Text> : <Text style={styles.warningText}>{item.errorMessage || 'Este item precisa de revisão individual.'}</Text>}
                        {!!item.contextSummary && <Text style={styles.helper}>{item.contextSummary}</Text>}
                        {item.contextChanged && <Text style={styles.warningText}>O contexto deste cadastro mudou. Confira os vínculos atuais antes de selecionar novamente.</Text>}
                        {!!item.changes?.length && <View style={styles.comparisonCard}>{item.changes.slice(0, expandedChanges[id] ? undefined : 3).map((change, index) => <View key={`${change.label}-${index}`} style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>{change.label}</Text><Text style={styles.helper}>Sua coleta: {change.collected}</Text><Text style={styles.helper}>Servidor: {change.current}</Text>
                        </View>)}{item.changes.length > 3 && <TouchableOpacity accessibilityRole="button" onPress={() => setExpandedChanges((old) => ({ ...old, [id]: !old[id] }))} style={styles.linkButton}><Text style={styles.link}>{expandedChanges[id] ? 'Mostrar menos' : `Ver as ${item.changes.length} diferenças`}</Text></TouchableOpacity>}</View>}
                    </View><TouchableOpacity accessibilityRole="button" accessibilityLabel={`${item.eligible ? 'Ajustar' : 'Abrir'} ${item.label}`} onPress={() => item.eligible ? edit(item) : onOpenSource(item)} style={styles.linkButton}><Text style={styles.link}>{item.eligible ? 'Ajustar' : 'Abrir'}</Text></TouchableOpacity></View>;
            }} ListFooterComponent={<Text style={[styles.helper, styles.listHint]}>Cada seleção corresponde a uma alteração completa. Falhas em outros itens não bloqueiam as selecionadas.</Text>} /> : <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {stage === 'COMMON' ? <><Text style={styles.pageTitle}>Uma opção para várias alterações</Text><Text style={styles.copy}>As exceções que você já ajustou continuam preservadas.</Text><PreferenceFields value={common} onChange={setCommon} />
                <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: remember }} onPress={() => setRemember(!remember)} style={styles.rememberRow}><View style={[styles.checkbox, remember && styles.checkboxSelected]}><Text style={styles.checkmark}>{remember ? '✓' : ''}</Text></View><Text style={[styles.helper, styles.flex]}>Sugerir esta opção nas próximas revisões desta visita.</Text></TouchableOpacity>
            </> : stage === 'ITEM' && editing && editingChoice ? <><Text style={styles.eyebrow}>EXCEÇÃO AO PADRÃO DA VISITA</Text><Text style={styles.pageTitle}>{editing.label}</Text><Text style={styles.copy}>Mude só este item. As demais alterações continuam com a opção comum.</Text>
                <PreferenceFields value={editingChoice} onChange={setEditingChoice} periodStart={editing.periodStart} perItem newConditionOnly={!visitAllowsCorrection(editing.entry.operation.kind)} />
                <Action secondary disabled={saving} onPress={() => {
                    setSaving(true); onSaveChoice(editing.entry.operation.operationId, undefined).then(() => { setExceptions((old) => { const next = { ...old }; delete next[editing.entry.operation.operationId]; return next; }); setStage('LIST'); })
                        .catch((error) => Alert.alert('Não foi possível remover a exceção', error?.message || 'Tente novamente.')).finally(() => setSaving(false));
                }}>Voltar a usar o padrão da visita</Action>
            </> : stage === 'SUMMARY' ? <><Text style={styles.eyebrow}>{chosen.length} ALTERAÇÃO(ÕES) SELECIONADA(S)</Text><Text style={styles.pageTitle}>Confira as datas antes de aplicar</Text><Text style={styles.copy}>A decisão fica salva no aparelho. A API confere o histórico antes de aplicar cada item.</Text>
                {groups.map((group, index) => <View key={index} style={styles.summaryCard}><Text style={styles.itemTitle}>{group.labels.length} {group.value.intent === 'CORRECTION' ? 'correção(ões)' : 'nova(s) condição(ões)'}</Text>
                    <Text style={styles.dateTitle}>{group.value.intent === 'CORRECTION' ? `Período mantido: ${dateToBrazilian(group.value.effectiveFrom)}` : dateToBrazilian(group.value.effectiveFrom)}</Text><Text style={styles.helper}>{group.value.reason}</Text>
                    <Text style={styles.summaryLabels}>{group.labels.slice(0, 3).join(' · ')}{group.labels.length > 3 ? ` · +${group.labels.length - 3}` : ''}</Text>
                </View>)}
                <Notice>Correções preservam o início de cada período. Novas condições criam um novo período. A sincronização com o sistema e o envio ao eSocial são etapas separadas.</Notice>
                <Text style={styles.helper}>Se o cadastro mudar no servidor, o item continua pendente para nova conferência. As outras alterações podem seguir.</Text>
            </> : null}
        </ScrollView>}
    </Sheet>;
}

const bytes = (size = 0) => size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`;
export function VisitRecoverySheet({ visible, busy, progress, result, error, onClose, onStart, onExport, onNewCopy }: {
    visible: boolean; busy: boolean; progress?: VisitRecoveryProgress; result?: VisitRecoveryResult; error?: string;
    onClose(): void; onStart(details: string): void; onExport(): void; onNewCopy(): void;
}) {
    const [details, setDetails] = useState('');
    const complete = result?.complete === true;
    const percent = progress?.totalBytes ? Math.min(100, Math.round((progress.uploadedBytes || 0) / progress.totalBytes * 100)) :
        progress?.totalFiles ? Math.min(100, Math.round((progress.completedFiles || 0) / progress.totalFiles * 100)) : 0;
    const code = result?.recoveryId || progress?.recoveryId;
    return <Sheet visible={visible} title="Recuperar visita" onClose={onClose} footer={complete ? <><Action onPress={onClose}>Concluir</Action><Action secondary onPress={onNewCopy}>Preparar outra cópia</Action></> : busy ? <Action secondary onPress={onClose}>Fechar e continuar no app</Action> : <>
        <Action onPress={() => onStart(details)}>{error || code ? 'Retomar envio para recuperação' : 'Enviar visita para recuperação'}</Action>
        {(!!code || !!error) && <Action secondary onPress={onNewCopy}>Preparar outra cópia</Action>}
        <Action secondary onPress={onExport}>Exportar cópia neste aparelho</Action>
    </>}>
        <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={styles.eyebrow}>ENVIO EXCEPCIONAL PARA O TI</Text>
            {complete ? <><View style={styles.successIcon}><Text style={styles.successIconText}>✓</Text></View><Text style={styles.pageTitle}>Visita recebida para recuperação</Text>
                <Text style={styles.copy}>Esta cópia completa está guardada para o TI investigar e recuperar os dados de forma organizada.</Text>
            </> : busy ? <><View style={styles.recoveryIcon}><Text style={styles.recoveryIconText}>↑</Text></View><Text style={styles.pageTitle}>Preservando a visita completa</Text>
                <Text style={styles.copy}>Dados, relações, fotos, áudios e vídeos ficam organizados no mesmo pacote.</Text></> : <><Text style={styles.pageTitle}>Não está conseguindo sincronizar?</Text>
                <Text style={styles.copy}>Envie uma cópia organizada da visita para o TI investigar. Essa alternativa preserva a coleta sem exigir que os cadastros sejam aplicados primeiro.</Text>
                <Notice>O pacote inclui os cadastros e relações da visita, os arquivos disponíveis e o diagnóstico da sincronização. O envio é privado e vinculado à sua empresa.</Notice>
            </>}
            {(busy || complete || code) && <View style={styles.dateCard}>
                {!complete && busy && <><Text style={styles.itemTitle}>{progress?.phase === 'PREPARING' ? 'Preparando a coleta' : progress?.phase === 'VERIFYING' ? 'Conferindo o recebimento' : 'Enviando arquivos'}</Text>
                    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percent}%` }]} /></View>
                    <Text style={styles.helper}>{progress?.completedFiles || 0} de {progress?.totalFiles || 0} arquivo(s){progress?.totalBytes ? ` · ${bytes(progress.uploadedBytes)} de ${bytes(progress.totalBytes)}` : ''}</Text></>}
                {!complete && !busy && <><Text style={styles.itemTitle}>Cópia parcial para recuperação</Text><Text style={styles.helper}>Este pacote ainda não tem confirmação completa. Retome o envio para aproveitar os arquivos que já chegaram.</Text></>}
                {!!code && <><Text style={styles.recoveryCodeLabel}>Código de recuperação</Text><Text selectable style={styles.recoveryCode}>{code}</Text>
                    <TouchableOpacity accessibilityRole="button" onPress={() => { Clipboard.setStringAsync(code).then(() => Alert.alert('Código copiado')).catch(() => Alert.alert('Código da recuperação', code)); }} style={styles.linkButton}><Text style={styles.link}>Copiar código</Text></TouchableOpacity></>}
                {complete && <Text style={styles.helper}>{result?.fileCount !== undefined ? `${result.fileCount} arquivo(s) recebido(s). ` : ''}{result?.receivedAt ? `Cópia recebida em ${new Date(result.receivedAt).toLocaleString('pt-BR')}.` : ''}</Text>}
            </View>}
            {!!error && <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text><Text style={styles.helper}>A coleta continua no aparelho. Ao retomar, o que já chegou é reaproveitado.</Text></View>}
            {!busy && !complete && result && <View style={styles.errorCard}><Text style={styles.errorText}>A cópia é parcial. Não apague os dados do aparelho. Envie o código acima ao TI para investigar os itens que faltam.</Text>
                {!!result.missingFiles?.length && <Text style={styles.helper}>{result.missingFiles.length} referência(s) de arquivos ou dados não puderam ser incluídas.</Text>}
                {!!result.failedFiles && <Text style={styles.helper}>{result.failedFiles} arquivo(s) ainda precisam concluir o envio.</Text>}
            </View>}
            {!busy && !complete && <><Text style={styles.label}>O que aconteceu? (opcional)</Text><TextInput accessibilityLabel="Descrição do problema de sincronização" value={details} onChangeText={setDetails} maxLength={2000}
                placeholder="Conte o que impediu a sincronização para ajudar o TI." placeholderTextColor="#718299" style={[styles.input, styles.multiline]} multiline /></>}
            <Notice>{complete ? 'Receber a cópia para recuperação não significa que os cadastros já foram aplicados. Informe este código ao TI.' : 'A confirmação só aparece depois que os dados e todos os arquivos do pacote forem recebidos. Se faltar um arquivo, a recuperação permanece incompleta.'}</Notice>
            <Text style={styles.helper}>{busy ? 'Mantenha o app aberto durante o envio. Se ele for encerrado, retome pelo mesmo botão.' : 'A coleta e os arquivos locais continuam preservados. Você pode tentar a sincronização normal novamente.'}</Text>
        </ScrollView>
    </Sheet>;
}

const styles = StyleSheet.create({
    flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: '#fff' }, header: { paddingRight: 20, paddingVertical: 10, minHeight: 70, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e6edf3' },
    backButton: { width: 52, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, backText: { color: '#254b70', fontSize: 35 }, headerTitle: { fontSize: 19, fontWeight: '700', color: '#253a51' }, headerSubtitle: { fontSize: 12, lineHeight: 17, color: '#718299', marginTop: 3 },
    content: { padding: 20, paddingBottom: 28 }, footer: { borderTopWidth: 1, borderTopColor: '#e1e9f0', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 6, backgroundColor: '#fff' }, footerHint: { color: '#61768a', fontSize: 12, marginBottom: 7 },
    button: { minHeight: 50, backgroundColor: '#254b70', padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' }, secondaryButton: { backgroundColor: '#fff' }, secondaryButtonText: { color: '#285c89' }, disabled: { opacity: 0.45 },
    eyebrow: { color: '#61788d', fontSize: 11, fontWeight: '700', letterSpacing: 0.7 }, pageTitle: { fontSize: 25, fontWeight: '700', lineHeight: 31, color: '#253a51', marginTop: 14, marginBottom: 12 }, copy: { fontSize: 14, lineHeight: 22, color: '#607287', marginBottom: 18 },
    choice: { flexDirection: 'row', gap: 12, padding: 14, borderWidth: 1, borderColor: '#cfdae5', borderRadius: 12, marginBottom: 12 }, choiceSelected: { borderColor: '#8faec7', backgroundColor: '#f3f8fd' }, choiceTitle: { color: '#253a51', fontSize: 15, fontWeight: '600', marginBottom: 4 },
    radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: '#9baebf', marginTop: 2, justifyContent: 'center', alignItems: 'center' }, radioSelected: { borderColor: '#285578' }, radioText: { color: '#285578', fontSize: 14, lineHeight: 17 },
    helper: { color: '#718299', fontSize: 12, lineHeight: 18, marginTop: 6 }, label: { color: '#334d65', fontSize: 14, fontWeight: '600', marginTop: 20, marginBottom: 8 }, input: { borderWidth: 1, borderColor: '#bacbda', borderRadius: 10, minHeight: 52, padding: 14, fontSize: 15, lineHeight: 21, color: '#203f5a', backgroundColor: '#fff' }, multiline: { minHeight: 94, textAlignVertical: 'top' },
    lockedField: { borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#d9e3ec', backgroundColor: '#f4f7fa' }, lockedText: { color: '#557087', fontSize: 15 }, notice: { padding: 14, backgroundColor: '#f1f6fb', borderRadius: 10, marginTop: 18, marginBottom: 14 }, noticeText: { color: '#486982', fontSize: 12, lineHeight: 19 },
    line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, dateCard: { padding: 16, borderWidth: 1, borderColor: '#d2e0ec', backgroundColor: '#f4f8fc', borderRadius: 14, marginBottom: 16 }, dateTitle: { color: '#253a51', fontSize: 21, fontWeight: '700', marginTop: 6, marginBottom: 4 },
    linkButton: { minHeight: 44, paddingHorizontal: 7, justifyContent: 'center' }, link: { color: '#285c89', fontSize: 13, fontWeight: '600' }, search: { marginTop: 2, marginBottom: 12, backgroundColor: '#f5f8fa' }, toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f4f8fc', borderRadius: 10, paddingHorizontal: 6, marginBottom: 6 },
    checkboxTouch: { minWidth: 36, minHeight: 48, paddingTop: 3, justifyContent: 'flex-start' }, checkbox: { width: 23, height: 23, borderWidth: 1.5, borderColor: '#adbdce', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, checkboxSelected: { backgroundColor: '#285578', borderColor: '#285578' }, checkmark: { color: '#fff', fontSize: 16, fontWeight: '600' },
    reviewRow: { flexDirection: 'row', gap: 5, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#e6edf3' }, itemTitle: { color: '#334d65', fontSize: 14, fontWeight: '600', lineHeight: 20 }, dateTag: { alignSelf: 'flex-start', color: '#335f82', backgroundColor: '#edf5fc', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5, fontSize: 12, marginTop: 8 }, exceptionTag: { color: '#895b24', backgroundColor: '#fff4e3' }, warningText: { color: '#93652c', fontSize: 12, lineHeight: 18, marginTop: 6 }, listHint: { marginTop: 16 },
    rememberRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 18, paddingVertical: 8, minHeight: 48 }, summaryCard: { borderWidth: 1, borderColor: '#d9e3ec', borderRadius: 12, padding: 16, marginBottom: 12 }, summaryLabels: { fontSize: 12, lineHeight: 19, color: '#607287', marginTop: 9 },
    comparisonCard: { marginTop: 10, padding: 10, borderWidth: 1, borderColor: '#dce5ee', borderRadius: 8, backgroundColor: '#f6f9fc' }, comparisonRow: { marginBottom: 8 }, comparisonLabel: { color: '#3c586f', fontSize: 12, fontWeight: '600' },
    recoveryIcon: { backgroundColor: '#edf4fa', width: 70, height: 70, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 22, marginBottom: 8 }, recoveryIconText: { fontSize: 38, color: '#2b5678' }, successIcon: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#eaf7ef', justifyContent: 'center', alignItems: 'center', marginTop: 22, marginBottom: 8 }, successIconText: { color: '#228457', fontSize: 34 },
    progressTrack: { height: 9, backgroundColor: '#e2ebf3', borderRadius: 8, marginTop: 18, marginBottom: 4, overflow: 'hidden' }, progressFill: { height: 9, backgroundColor: '#315e82', borderRadius: 8 }, recoveryCodeLabel: { color: '#60778c', fontSize: 12, marginTop: 17 }, recoveryCode: { color: '#254b70', fontSize: 19, fontWeight: '700', marginTop: 8 }, errorCard: { padding: 14, backgroundColor: '#fff4e7', borderRadius: 10, marginVertical: 10 }, errorText: { color: '#8f5627', fontSize: 13, lineHeight: 20 },
});
