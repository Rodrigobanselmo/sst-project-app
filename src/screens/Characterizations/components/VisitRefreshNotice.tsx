import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type VisitRefreshPhase = 'idle' | 'checking' | 'refreshing' | 'fresh' | 'partial' | 'offline' | 'failed' | 'skipped';

export interface VisitRefreshNoticeProps {
    visitKey: string;
    phase: VisitRefreshPhase;
    lastSuccessfulAt?: string;
    hasLocalSnapshot: boolean;
    retryDisabled?: boolean;
    onRetry(): Promise<void>;
    onContinue(): Promise<void>;
}

function lastUpdateLabel(value?: string): string {
    if (!value) return 'Última atualização: ainda não confirmada neste aparelho.';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Última atualização: ainda não confirmada neste aparelho.';
    const pad = (part: number) => String(part).padStart(2, '0');
    return `Última atualização: ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} às ${pad(date.getHours())}:${pad(date.getMinutes())}.`;
}

export function VisitRefreshNotice({ visitKey, phase, lastSuccessfulAt, hasLocalSnapshot, retryDisabled = false, onRetry, onContinue }: VisitRefreshNoticeProps) {
    const [expanded, setExpanded] = useState(true);
    const [confirmSkip, setConfirmSkip] = useState(false);
    const [continuing, setContinuing] = useState(false);
    const [continueError, setContinueError] = useState<string>();
    const [continuedFrom, setContinuedFrom] = useState<VisitRefreshPhase>();
    const refreshing = phase === 'refreshing' || phase === 'checking' || phase === 'idle';
    const fresh = phase === 'fresh';

    useEffect(() => { setExpanded(true); setConfirmSkip(false); setContinuedFrom(undefined); }, [visitKey]);
    useEffect(() => {
        if (fresh) { setExpanded(false); setConfirmSkip(false); }
    }, [fresh]);

    const continueLocally = async () => {
        if (continuing) return;
        setContinuing(true); setContinueError(undefined);
        setContinuedFrom(phase);
        try {
            // The controller first stops remote writes, then releases the local editor.
            await onContinue();
            setExpanded(false); setConfirmSkip(false);
        } catch {
            setContinueError('Não foi possível encerrar a atualização. Tente continuar novamente.');
        } finally { setContinuing(false); }
    };
    const displayPhase = phase === 'skipped' && (continuedFrom === 'offline' || continuedFrom === 'partial') ? continuedFrom : phase;
    const title = fresh ? 'Cadastro atualizado no aparelho' : refreshing ? 'Conferindo os dados da visita' :
        displayPhase === 'partial' ? 'Atualização consultada, alterações locais preservadas' : displayPhase === 'offline' ? 'Sem conexão · atualização não confirmada' :
            phase === 'failed' ? 'Não foi possível atualizar agora' : 'Atualização não confirmada';
    const warning = hasLocalSnapshot ? 'Os valores locais podem estar desatualizados. Mudanças feitas em outro aparelho podem exigir revisão ao sincronizar.' :
        'Ainda não há uma atualização confirmada neste aparelho. Você pode iniciar uma coleta nova; cadastros já existentes podem não estar disponíveis.';
    const description = phase === 'partial' ? 'O cadastro foi consultado. As alterações que já estavam neste aparelho foram preservadas e podem precisar de revisão ao sincronizar.' :
        refreshing ? 'Os dados disponíveis no aparelho já estão carregados. O app está tentando consultar o cadastro mais recente antes de você continuar a visita.' : warning;
    const showChoice = !fresh && (expanded || confirmSkip);
    const retry = () => {
        if (retryDisabled) return;
        setExpanded(true); setConfirmSkip(false); setContinueError(undefined); setContinuedFrom(undefined); void onRetry();
    };

    return <>
        <View style={[styles.notice, !fresh && !refreshing && styles.warning]} accessibilityLiveRegion="polite">
            <View style={styles.heading}>
                {refreshing && <ActivityIndicator color="#315e82" size="small" style={styles.spinner} />}
                <Text style={[styles.title, !fresh && !refreshing && styles.warningTitle]}>{title}</Text>
            </View>
            <Text style={styles.timestamp}>{lastUpdateLabel(lastSuccessfulAt)}</Text>
            <View style={styles.actions}>
                {refreshing ? <TouchableOpacity accessibilityRole="button" onPress={() => setConfirmSkip(true)} style={styles.action}>
                    <Text style={styles.actionText}>Continuar sem atualizar</Text>
                </TouchableOpacity> : <>
                    <TouchableOpacity accessibilityRole="button" disabled={retryDisabled} accessibilityState={{ disabled: retryDisabled }} onPress={retry} style={[styles.action, retryDisabled && styles.disabled]}>
                        <Text style={styles.actionText}>{fresh ? 'Atualizar novamente' : 'Tentar atualizar'}</Text>
                    </TouchableOpacity>
                </>}
            </View>
        </View>
        <Modal visible={showChoice} transparent animationType="slide" onRequestClose={() => {
            if (continuing) return;
            if (refreshing && !confirmSkip) setConfirmSkip(true);
            else if (confirmSkip) setConfirmSkip(false);
            else void continueLocally();
        }}>
            <View style={styles.overlay}><View style={styles.dialog} accessibilityViewIsModal>
                <ScrollView keyboardShouldPersistTaps="handled">
                    <Text style={styles.eyebrow}>DADOS DA VISITA NESTE APARELHO</Text>
                    <Text style={styles.dialogTitle}>{confirmSkip ? 'Continuar sem atualizar?' : title}</Text>
                    {refreshing && !confirmSkip && <ActivityIndicator color="#315e82" size="small" style={styles.dialogSpinner} />}
                    <Text style={styles.dialogCopy}>{confirmSkip ? warning : description}</Text>
                    <View style={styles.dateCard}><Text style={styles.timestamp}>{lastUpdateLabel(lastSuccessfulAt)}</Text></View>
                    <Text style={styles.dialogCopy}>Sua coleta continuará salva no aparelho. Você poderá tentar atualizar depois.</Text>
                    {!!continueError && <Text style={styles.error}>{continueError}</Text>}
                </ScrollView>
                {confirmSkip ? <>
                    <TouchableOpacity accessibilityRole="button" disabled={continuing} onPress={() => { void continueLocally(); }} style={styles.primaryAction}>
                        <Text style={styles.primaryText}>{continuing ? 'Preparando a coleta local…' : 'Continuar sem atualizar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" disabled={continuing || (!refreshing && retryDisabled)} onPress={() => { setConfirmSkip(false); if (!refreshing) retry(); }} style={styles.continueAction}>
                        <Text style={styles.actionText}>{refreshing ? 'Aguardar atualização' : 'Tentar atualizar'}</Text>
                    </TouchableOpacity>
                </> : refreshing ? <TouchableOpacity accessibilityRole="button" onPress={() => setConfirmSkip(true)} style={styles.continueAction}>
                    <Text style={styles.actionText}>Continuar sem atualizar</Text>
                </TouchableOpacity> : <>
                    <TouchableOpacity accessibilityRole="button" disabled={continuing} onPress={() => { void continueLocally(); }} style={styles.primaryAction}>
                        <Text style={styles.primaryText}>{continuing ? 'Preparando a coleta local…' : 'Continuar com os dados locais'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" disabled={continuing || retryDisabled} accessibilityState={{ disabled: continuing || retryDisabled }} onPress={retry} style={[styles.continueAction, retryDisabled && styles.disabled]}>
                        <Text style={styles.actionText}>Tentar atualizar</Text>
                    </TouchableOpacity>
                </>}
            </View></View>
        </Modal>
    </>;
}

const styles = StyleSheet.create({
    notice: { marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, borderWidth: 1, borderColor: '#d2e0ec', borderRadius: 10, backgroundColor: '#f4f8fc' },
    warning: { borderColor: '#e8d6b9', backgroundColor: '#fff8ed' },
    heading: { flexDirection: 'row', alignItems: 'center' }, spinner: { marginRight: 9 },
    title: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', color: '#254b70' }, warningTitle: { color: '#805b2b' },
    timestamp: { fontSize: 12, lineHeight: 18, color: '#61768a', marginTop: 4 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14 },
    action: { minHeight: 44, justifyContent: 'center', paddingVertical: 10 }, actionText: { fontSize: 13, lineHeight: 19, color: '#285c89', fontWeight: '600' },
    disabled: { opacity: 0.45 },
    overlay: { flex: 1, backgroundColor: '#0008', paddingTop: 20, justifyContent: 'flex-end' },
    dialog: { maxHeight: '85%', borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: '#fff', padding: 20, paddingBottom: 28 },
    eyebrow: { fontSize: 10, lineHeight: 16, color: '#61788d', fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 },
    dialogTitle: { fontSize: 21, lineHeight: 27, color: '#253a51', fontWeight: '700', marginBottom: 14 }, dialogSpinner: { alignSelf: 'flex-start', marginBottom: 14 },
    dialogCopy: { fontSize: 14, lineHeight: 22, color: '#607287', marginBottom: 16 },
    dateCard: { borderRadius: 10, backgroundColor: '#f4f8fc', padding: 12, marginBottom: 16 },
    error: { color: '#8f5627', fontSize: 13, lineHeight: 20, marginBottom: 16 },
    primaryAction: { minHeight: 50, padding: 14, backgroundColor: '#254b70', alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
    primaryText: { fontSize: 14, color: '#fff', fontWeight: '600', textAlign: 'center' },
    continueAction: { minHeight: 50, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
});
