export const VISIT_REVIEW_BATCH_LIMIT = 100;
export interface SelectableVisitItem { eligible: boolean; entry: { operation: { operationId: string } } }

/** Keep existing choices and fill the next review batch, without silently selecting more than the API accepts. */
export function selectVisitBatch(items: SelectableVisitItem[], selected: Record<string, boolean> = {}): Record<string, boolean> {
    const next = { ...selected };
    let count = Object.values(next).filter(Boolean).length;
    for (const item of items) {
        const id = item.entry.operation.operationId;
        if (!item.eligible || next[id]) continue;
        if (count >= VISIT_REVIEW_BATCH_LIMIT) break;
        next[id] = true; count += 1;
    }
    return next;
}
export function toggleVisitSelection(selected: Record<string, boolean>, operationId: string) {
    if (!selected[operationId] && Object.values(selected).filter(Boolean).length >= VISIT_REVIEW_BATCH_LIMIT) return { selected, limitReached: true };
    return { selected: { ...selected, [operationId]: !selected[operationId] }, limitReached: false };
}
