import { database } from '@libs/watermelon';
import { synchronize } from '@nozbe/watermelondb/sync';
import { useNetInfo } from '@react-native-community/netinfo';
import { CompanyRepository } from '@repositories/companyRepository';
import { getSyncChanges } from '@services/api/sync/getSyncChanges';
import { useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { storageUserGet } from '@libs/storage/disk/user';
import { VisitRefreshGate } from '@libs/sync/visitFreshness';
import { catalogChangesForUpsert } from '@libs/sync/catalogChanges';
const catalogSyncs = new Map<number, Promise<void>>();
interface CatalogSyncOptions { companyStartIds?: string[]; refreshGate?: VisitRefreshGate }

export function useSync() {
    const netInfo = useNetInfo();
    const synchronizing = useRef<Record<string, boolean>>({});
    const { user } = useAuth();

    // Store netInfo.isConnected in a ref to avoid recreating callbacks on every network change
    const isConnectedRef = useRef(netInfo.isConnected);
    isConnectedRef.current = netInfo.isConnected;

    const offlineSynchronize = useCallback(
        async (options?: CatalogSyncOptions) => {
            const prior = catalogSyncs.get(user.id);
            if (prior && !options?.refreshGate) return prior;
            if (prior) { try { await prior; } catch { /* The explicit retry makes its own authorized request. */ } }
            options?.refreshGate?.assertActive();
            let endApplying: (() => void) | undefined;
            const task = synchronize({
                    database,
                    // Login and explicit company refreshes can replay existing IDs.
                    // Use Watermelon's upsert protocol; do not silence its diagnostics.
                    sendCreatedAsUpdated: true,
                    pullChanges: async ({ lastPulledAt }) => {
                        const assertActor = async () => { if ((await storageUserGet())?.id !== user.id) throw new Error('A sessão mudou. As coletas locais foram preservadas.'); };
                        await assertActor();
                        options?.refreshGate?.assertActive();
                        const companyRepository = new CompanyRepository();

                        const { companies } = await companyRepository.findMany({ userId: user.id });
                        const previousActor = await database.localStorage.get<number>('mobile-catalog-actor-v1');
                        const { changes, latestVersion } = await getSyncChanges({
                            lastPulledVersion: previousActor === user.id && lastPulledAt ? new Date(lastPulledAt) : undefined,
                            companyIds: companies.map((c) => c.id),
                            companyStartIds: options?.companyStartIds,
                        }, options?.refreshGate?.signal);
                        await assertActor();
                        options?.refreshGate?.assertActive();
                        const upserts = catalogChangesForUpsert(changes, user.id);
                        // synchronize applies the returned changes using SQLite only.
                        // Continuing can abort networking without waiting for its timeout,
                        // but waits for an already-started local commit to finish.
                        endApplying = options?.refreshGate?.begin();

                        return {
                            changes: upserts,
                            timestamp: latestVersion,
                        };
                    },
                });
            catalogSyncs.set(user.id, task);
            try { await task; await database.localStorage.set('mobile-catalog-actor-v1', user.id); }
            finally { endApplying?.(); if (catalogSyncs.get(user.id) === task) catalogSyncs.delete(user.id); }
        },
        [user.id],
    );

    const syncChanges = useCallback(
        async (options?: CatalogSyncOptions) => {
            if (isConnectedRef.current === false) return { offline: true };
            if (!synchronizing.current[getSyncChanges.name] || options?.refreshGate) {
                synchronizing.current[getSyncChanges.name] = true;

                try {
                    await offlineSynchronize(options);
                    return { success: true };
                } catch (error: any) {
                    return { error, errorMessage: error?.message || 'Não foi possível atualizar os dados. As coletas foram preservadas.' };
                } finally {
                    synchronizing.current[getSyncChanges.name] = false;
                }
            }
        },
        [offlineSynchronize],
    );

    return { syncChanges, offlineSynchronize };
}
