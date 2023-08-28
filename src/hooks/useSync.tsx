import { database } from '@libs/watermelon';
import { synchronize } from '@nozbe/watermelondb/sync';
import { getSyncChanges } from '@services/api/sync/getSyncChanges';
import { useNetInfo } from '@react-native-community/netinfo';
import { useCallback, useRef } from 'react';

export function useSync() {
    const netInfo = useNetInfo();
    const synchronizing = useRef<Record<string, boolean>>({});

    const offlineSynchronize = useCallback(
        async (getSyncChanges: (arg: { lastPulledVersion?: Date }) => Promise<any>) => {
            try {
                await synchronize({
                    database,
                    pullChanges: async ({ lastPulledAt }) => {
                        const { changes, latestVersion } = await getSyncChanges({
                            lastPulledVersion: lastPulledAt ? new Date(lastPulledAt) : undefined,
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
        [],
    );

    const syncChanges = useCallback(
        async (getSyncChanges: (arg: { lastPulledVersion?: Date }) => Promise<any>) => {
            if (netInfo.isConnected && !synchronizing.current[getSyncChanges.name]) {
                synchronizing.current[getSyncChanges.name] = true;

                try {
                    await offlineSynchronize(getSyncChanges);
                } catch (error: any) {
                    console.log('error', error);
                    return { error, errorMessage: 'message' in error ? error.message : 'Erro ao syncronizar dados' };
                } finally {
                    synchronizing.current[getSyncChanges.name] = false;
                }
            }
        },
        [netInfo.isConnected, offlineSynchronize],
    );

    return { syncChanges, offlineSynchronize };
}
