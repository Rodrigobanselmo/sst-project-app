/** The transport receipt is separate from the editable Watermelon records. */
export type SyncKind = 'CHARACTERIZATION' | 'RISK_DATA' | 'REC_MED' | 'GENERATE_SOURCE' | 'SUB_OFFICE' |
    'CHARACTERIZATION_DELETE' | 'RISK_DATA_DELETE' | 'PHOTO_DELETE' | 'FILE_DELETE' | 'PHOTO' | 'AUDIO' | 'VIDEO';
export type SyncState = 'PENDING' | 'RECEIVED' | 'APPLIED' | 'NEEDS_REVIEW' | 'WAITING_DEPENDENCY' | 'RETRY';
export interface SyncContext { userId: number; companyId: string; workspaceId: string; deviceId: string }
export interface SyncDecision { intent: 'CORRECTION' | 'NEW_CONDITION'; effectiveFrom?: string; reason: string; expectedHead?: string }
export interface SyncDraft {
    kind: SyncKind; entityId: string; payload: Record<string, any>; baseSnapshotHash?: string;
    decision?: SyncDecision; dependsOn?: string[]; supersedesOperationId?: string;
    decisionPlanId?: string;
}
export interface SyncOperation extends SyncDraft { operationId: string }
export interface SyncReceipt {
    operationId: string; kind: SyncKind; entityId: string; state: SyncState;
    receivedAt?: string; appliedAt?: string; result?: any;
    error?: { code?: string; message?: string; details?: any; expectedHead?: string; currentSnapshotHash?: string;
        snapshot?: Record<string, any>; effectiveFrom?: string; reviewContextHash?: string };
    retryable?: boolean; baseSnapshotHash?: string;
    snapshot?: Record<string, any>; durable?: boolean;
}
export interface SyncEntry {
    operation: SyncOperation; fingerprint: string; capturedAt: string; attempts: number;
    receipt: SyncReceipt; lastAttemptAt?: string; sequence?: number;
}
export interface SyncBase {
    baseSnapshotHash?: string; snapshot: Record<string, any>; localSnapshot?: Record<string, any>;
}
export interface SyncDocument {
    version: 1; context: SyncContext; entries: SyncEntry[]; bases: Record<string, SyncBase>;
    settings?: Record<string, any>;
}
export interface SyncStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem?(key: string): Promise<void>;
}
export interface SyncClient {
    send(operations: SyncOperation[], context: SyncContext, options?: { deferApplication?: boolean }): Promise<{ receipts: SyncReceipt[] }>;
    upload?(operation: SyncOperation, context: SyncContext): Promise<SyncReceipt>;
    receipts?(context: SyncContext): Promise<{ operations: SyncReceipt[] }>;
}
export interface SyncSummary {
    total: number; applied: number; received: number; review: number; pending: number; mediaPending: number;
}
