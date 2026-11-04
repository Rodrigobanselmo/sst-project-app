import { useNetInfo } from '@react-native-community/netinfo';
import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { pullCharacterizations } from '@libs/sync/pull';
export { onGenerateSyncCharacterizatinKey } from '@libs/sync/pull';
interface IOptions { companyId: string; workspaceId: string }
export function useSyncCharacterization() {
    const netInfo = useNetInfo();
    const { user } = useAuth();
    const syncCharacterization = useCallback(async (options: IOptions) => {
        if (netInfo.isConnected === false) return { offline: true };
        try { await pullCharacterizations({ ...options, userId: user.id }); return { success: true }; }
        catch (error: any) { return { error, errorMessage: error?.message || 'Não foi possível atualizar. As coletas locais foram preservadas.' }; }
    }, [netInfo.isConnected, user.id]);
    return { syncCharacterization };
}
