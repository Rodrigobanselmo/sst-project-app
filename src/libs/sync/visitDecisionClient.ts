import { api } from '@services/api';
import { storageUserGet } from '@libs/storage/disk/user';
import { storageAuthTokenGet } from '@libs/storage/disk/token';
import { SyncJournal } from './journal';
import { VisitDecisionClient } from './visitDecisions';

export function createVisitDecisionClient(journal: SyncJournal): VisitDecisionClient {
    const post = async (route: string, request: any) => {
        const user = await storageUserGet();
        const tokens = await storageAuthTokenGet();
        if (!user || Number(user.id) !== journal.context.userId || Number((await storageUserGet())?.id) !== journal.context.userId || !tokens.token) {
            throw Object.assign(new Error('Entre com o usuário desta coleta para confirmar as datas. As escolhas estão salvas.'), { code: 'AUTH_SESSION_CHANGED', status: 401 });
        }
        try {
            const result = await api.post(`/companies/${journal.context.companyId}/mobile-sync/${route}`, request,
                { timeout: 30000, headers: { Authorization: `Bearer ${tokens.token}` } });
            return result.data;
        } catch (error: any) {
            const body = error?.response?.data;
            const message = typeof body?.message === 'string' ? body.message : error?.message || 'Não foi possível confirmar a revisão.';
            throw Object.assign(new Error(message), { code: body?.code || error?.code, status: error?.response?.status || error?.status });
        }
    };
    return { createPlan: (request) => post('decision-plans', request), review: (request) => post('decision-review', request) };
}
