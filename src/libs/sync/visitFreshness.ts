export interface VisitFreshnessContext { userId: number; companyId: string; workspaceId: string }
export type VisitFreshnessPhase = 'idle' | 'checking' | 'refreshing' | 'fresh' | 'partial' | 'offline' | 'failed' | 'skipped';
export interface VisitFreshnessState { phase: VisitFreshnessPhase; lastSuccessfulAt?: string; hasLocalSnapshot: boolean; error?: string; pendingLocalChanges?: boolean }
interface FreshnessRecord { version: 1; activeAttempt?: string; lastSuccessfulAt?: string; lastAttemptAt?: string; lastContinuedAt?: string }
export const visitFreshnessKey = (context: VisitFreshnessContext) => `mobile-visit-freshness-v1:${context.userId}:${context.companyId}:${context.workspaceId}`;
const cancelled = () => Object.assign(new Error('A atualização foi interrompida para continuar com os dados locais.'), { code: 'VISIT_REFRESH_CANCELLED' });

/** Network can be cancelled immediately; continuing waits only for local commits already started. */
export class VisitRefreshGate {
    active = true;
    private abort = new AbortController();
    private writers = 0;
    private waiters: (() => void)[] = [];
    get signal() { return this.abort.signal; }
    assertActive() { if (!this.active) throw cancelled(); }
    begin(): () => void {
        this.assertActive(); this.writers++;
        let ended = false;
        return () => {
            if (ended) return; ended = true; this.writers--;
            if (!this.writers) { const waiting = this.waiters.splice(0); waiting.forEach((resolve) => resolve()); }
        };
    }
    async run<T>(action: () => Promise<T>): Promise<T> {
        const end = this.begin();
        try { return await action(); } finally { end(); }
    }
    async stop(): Promise<void> {
        this.active = false; this.abort.abort();
        if (this.writers) await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
}
export interface VisitFreshnessDependencies {
    storage: { get(key: string): Promise<any>; set(key: string, value: any): Promise<void> };
    connected(): Promise<boolean | null>;
    hasLocalSnapshot(): Promise<boolean>;
    refreshCatalogs(gate: VisitRefreshGate): Promise<void>;
    refreshVisit(gate: VisitRefreshGate): Promise<{ complete: boolean; pendingLocalChanges?: boolean }>;
    now(): string; id(): string; onState?(state: VisitFreshnessState): void;
}
const metadataWrites = new Map<string, Promise<any>>();
/** Status is independent of transport ACKs and declaration receipts. Offline work always remains available. */
export class VisitFreshnessController {
    readonly key: string;
    current: VisitFreshnessState = { phase: 'idle', hasLocalSnapshot: false };
    private gate?: VisitRefreshGate;
    private request?: Promise<void>;
    private generation = 0;
    private disposed = false;
    constructor(readonly context: VisitFreshnessContext, private deps: VisitFreshnessDependencies) { this.key = visitFreshnessKey(context); }
    private emit(next: Partial<VisitFreshnessState>) {
        this.current = { ...this.current, ...next };
        if (!this.disposed) { try { this.deps.onState?.({ ...this.current }); } catch { /* UI cannot block preserving data. */ } }
    }
    private async record(update: (previous: FreshnessRecord) => FreshnessRecord): Promise<FreshnessRecord> {
        const prior = metadataWrites.get(this.key) || Promise.resolve();
        const next = prior.catch(() => undefined).then(async () => {
            const previous = await this.deps.storage.get(this.key);
            const value = update(previous?.version === 1 ? previous : { version: 1 });
            await this.deps.storage.set(this.key, value); return value;
        });
        metadataWrites.set(this.key, next);
        try { return await next; } finally { if (metadataWrites.get(this.key) === next) metadataWrites.delete(this.key); }
    }
    start() { return this.retry(); }
    retry(): Promise<void> {
        if (this.disposed) return Promise.resolve();
        if (this.request && this.gate?.active) return this.request;
        const generation = ++this.generation, gate = new VisitRefreshGate(); this.gate = gate;
        const current = () => !this.disposed && this.generation === generation && gate.active;
        const task = (async () => {
            this.emit({ phase: 'checking', error: undefined, pendingLocalChanges: false });
            try {
                const [record, hasLocalSnapshot, connected] = await Promise.all([
                    this.deps.storage.get(this.key), this.deps.hasLocalSnapshot(), this.deps.connected(),
                ]);
                if (!current()) return;
                this.emit({ lastSuccessfulAt: record?.version === 1 ? record.lastSuccessfulAt : undefined, hasLocalSnapshot });
                if (connected === false) { this.emit({ phase: 'offline' }); return; }
                const attempt = this.deps.id();
                await this.record((previous) => ({ ...previous, activeAttempt: attempt, lastAttemptAt: this.deps.now() }));
                if (!current()) return;
                this.emit({ phase: 'refreshing' });
                await this.deps.refreshCatalogs(gate);
                gate.assertActive();
                const result = await this.deps.refreshVisit(gate);
                if (!current()) return;
                if (!result?.complete || result.pendingLocalChanges) {
                    const hasLocalSnapshot = await this.deps.hasLocalSnapshot();
                    if (current()) this.emit({ phase: 'partial', pendingLocalChanges: result?.pendingLocalChanges, hasLocalSnapshot }); return;
                }
                const finishedAt = this.deps.now();
                const saved = await this.record((previous) => previous.activeAttempt === attempt && current()
                    ? { ...previous, lastSuccessfulAt: finishedAt } : previous);
                if (current()) this.emit({ phase: 'fresh', lastSuccessfulAt: saved.lastSuccessfulAt, hasLocalSnapshot: true });
            } catch (error: any) {
                if (current()) this.emit({ phase: 'failed', error: error?.message || 'Não foi possível atualizar os dados. Você pode continuar com a coleta local.' });
            }
        })();
        this.request = task;
        void task.finally(() => { if (this.request === task) this.request = undefined; }).catch(() => undefined);
        return task;
    }
    async continueWithoutRefresh(): Promise<void> {
        ++this.generation;
        await this.gate?.stop();
        this.emit({ phase: 'skipped', error: undefined });
        try { await this.record((previous) => ({ ...previous, activeAttempt: undefined, lastContinuedAt: this.deps.now() })); }
        catch { /* A status-write error must not prohibit the visit or erase its collection. */ }
    }
    async dispose(): Promise<void> { this.disposed = true; ++this.generation; await this.gate?.stop(); }
}
