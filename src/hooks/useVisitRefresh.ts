import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { database } from '@libs/watermelon';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid';
import { pullCharacterizations, onGenerateSyncCharacterizatinKey } from '@libs/sync/pull';
import { VisitFreshnessController, VisitFreshnessState } from '@libs/sync/visitFreshness';
import { useAuth } from './useAuth';
import { useSync } from './useSync';
import { storageUserGet } from '@libs/storage/disk/user';

interface Options { companyId?: string; workspaceId: string; enabled: boolean; onRefreshed?(): Promise<void> }
const initial: VisitFreshnessState = { phase: 'idle', hasLocalSnapshot: false };
export function useVisitRefresh(options: Options) {
    const { user } = useAuth();
    const { offlineSynchronize } = useSync();
    const callbacks = useRef({ offlineSynchronize, onRefreshed: options.onRefreshed });
    callbacks.current = { offlineSynchronize, onRefreshed: options.onRefreshed };
    const controller = useRef<VisitFreshnessController | undefined>(undefined);
    const [state, setState] = useState<VisitFreshnessState>(initial);
    useEffect(() => {
        if (!options.enabled || !options.companyId) return;
        let mounted = true;
        const context = { userId: user.id, companyId: options.companyId, workspaceId: options.workspaceId };
        const assertActor = async () => {
            if (Number((await storageUserGet())?.id) !== context.userId) throw new Error('A sessão mudou. Sua coleta permanece no aparelho.');
        };
        const current = new VisitFreshnessController(context, {
            storage: database.localStorage,
            async connected() {
                const connection = await NetInfo.fetch();
                return connection.isConnected === false || connection.isInternetReachable === false ? false : connection.isConnected;
            },
            async hasLocalSnapshot() {
                const cursor = await database.localStorage.get<string>(onGenerateSyncCharacterizatinKey(context));
                return !!cursor || (await database.get('CompanyCharacterization').query(Q.where('workspaceId', context.workspaceId), Q.where('user_id', String(context.userId))).fetchCount()) > 0;
            },
            async refreshCatalogs(gate) {
                await assertActor();
                await callbacks.current.offlineSynchronize({ companyStartIds: [context.companyId], refreshGate: gate });
                await assertActor();
            },
            async refreshVisit(gate) {
                await assertActor();
                const result = await pullCharacterizations({ ...context, refreshGate: gate });
                await assertActor();
                if (gate.active) await callbacks.current.onRefreshed?.();
                return result;
            },
            id: () => String(uuid.v4()), now: () => new Date().toISOString(),
            onState: (value) => { if (mounted) setState(value); },
        });
        controller.current = current; void current.start();
        return () => { mounted = false; if (controller.current === current) controller.current = undefined; void current.dispose(); };
    }, [options.companyId, options.workspaceId, options.enabled, user.id]);
    const retry = useCallback(async () => { await controller.current?.retry(); }, []);
    const continueWithoutRefresh = useCallback(async () => { await controller.current?.continueWithoutRefresh(); }, []);
    return { state, retry, continueWithoutRefresh };
}
