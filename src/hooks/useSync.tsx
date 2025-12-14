import { database } from '@libs/watermelon';
import { synchronize } from '@nozbe/watermelondb/sync';
import { useNetInfo } from '@react-native-community/netinfo';
import { CompanyRepository } from '@repositories/companyRepository';
import { getSyncChanges } from '@services/api/sync/getSyncChanges';
import { useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

export function useSync() {
    const netInfo = useNetInfo();
    const synchronizing = useRef<Record<string, boolean>>({});
    const { user } = useAuth();

    // Store netInfo.isConnected in a ref to avoid recreating callbacks on every network change
    const isConnectedRef = useRef(netInfo.isConnected);
    isConnectedRef.current = netInfo.isConnected;

    const offlineSynchronize = useCallback(
        async (options?: { companyStartIds?: string[] }) => {
            try {
                await synchronize({
                    database,
                    pullChanges: async ({ lastPulledAt }) => {
                        const companyRepository = new CompanyRepository();

                        const { companies } = await companyRepository.findMany({ userId: user.id });
                        const { changes, latestVersion } = await getSyncChanges({
                            lastPulledVersion: lastPulledAt ? new Date(lastPulledAt) : undefined,
                            companyIds: companies.map((c) => c.id),
                            companyStartIds: options?.companyStartIds,
                        });

                        return {
                            changes: changes,
                            timestamp: latestVersion,
                        };
                    },
                    pushChanges: async ({ changes }) => {},
                });
            } catch (err) {
                console.error(err);
            }
        },
        [user.id],
    );

    const syncChanges = useCallback(
        async (options?: { companyStartIds?: string[] }) => {
            if (isConnectedRef.current && !synchronizing.current[getSyncChanges.name]) {
                synchronizing.current[getSyncChanges.name] = true;

                try {
                    await offlineSynchronize(options);
                } catch (error: any) {
                    return { error, errorMessage: 'message' in error ? error.message : 'Erro ao syncronizar dados' };
                } finally {
                    synchronizing.current[getSyncChanges.name] = false;
                }
            }
        },
        [offlineSynchronize],
    );

    return { syncChanges, offlineSynchronize };
}
