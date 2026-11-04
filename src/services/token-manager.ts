import axios, { AxiosHeaders, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { AppError } from '../utils/errors';

type Tokens = { token?: string; refresh_token?: string };
type Request = InternalAxiosRequestConfig & { _sstRetried?: boolean; _sstActor?: string | null };
type Dependencies = {
    getTokens: () => Promise<Tokens>;
    saveTokens: (tokens: { token: string; refresh_token: string }) => Promise<void>;
    getActor: () => Promise<string | null>;
    getRefreshContext?: () => Promise<{ companyId?: string }>;
    signOut: () => void | Promise<void>;
    refreshPath: string;
    refreshClient?: AxiosInstance;
};

export function apiError(error: any): AppError {
    if (error instanceof AppError) return error;
    const status = error?.response?.status;
    const details = error?.response?.data;
    return new AppError(details?.message || error?.message || 'Falha de conexão. Tente sincronizar novamente.', {
        status,
        code: details?.code || error?.code,
        details,
        retryable: !status || status === 408 || status === 429 || status >= 500,
    });
}

// Refresh uses a separate client and is single-flight. Replay keeps FormData
// and idempotency headers intact. Network failures never erase offline work.
export function installTokenManager(api: AxiosInstance, deps: Dependencies): () => void {
    const refreshClient = deps.refreshClient || axios.create({ baseURL: api.defaults.baseURL, timeout: 15000 });
    let refreshing: Promise<string> | null = null;
    let disposed = false;
    const isSessionRoute = (url = '') => /\/(?:session(?:\/google)?|refresh)(?:\?|$)/.test(url);
    const sessionChanged = () => new AppError('A sessão mudou. Entre novamente antes de sincronizar esta coleta.', { code: 'AUTH_SESSION_CHANGED', retryable: false });
    const expired = () => new AppError('Sua sessão expirou. Entre novamente; as coletas continuam salvas no aparelho.', { status: 401, code: 'AUTH_EXPIRED', retryable: false });
    const assertActor = async (request: Request) => {
        if (disposed || request._sstActor !== await deps.getActor()) throw sessionChanged();
    };
    const invalidate = async (request: Request) => {
        await assertActor(request);
        await deps.signOut();
        throw expired();
    };
    const replay = async (request: Request, token: string) => {
        await assertActor(request);
        request._sstRetried = true;
        request.headers = AxiosHeaders.from(request.headers);
        request.headers.set('Authorization', `Bearer ${token}`);
        return api.request(request);
    };

    const requestId = api.interceptors.request.use(async (config: Request) => {
        if (!isSessionRoute(config.url) && config._sstActor === undefined) config._sstActor = await deps.getActor();
        return config;
    });
    const responseId = api.interceptors.response.use((response) => response, async (error) => {
        const request: Request | undefined = error?.config;
        if (!request || error?.response?.status !== 401 || isSessionRoute(request.url)) throw apiError(error);
        await assertActor(request);
        if (request._sstRetried) return invalidate(request);
        const tokens = await deps.getTokens();
        if (!tokens.refresh_token) return invalidate(request);
        const previousAuthorization = AxiosHeaders.from(request.headers).get('Authorization');
        // A sibling may already have completed the same refresh.
        if (tokens.token && previousAuthorization && previousAuthorization !== `Bearer ${tokens.token}`) return replay(request, tokens.token);
        if (!refreshing) {
            const originalRefreshToken = tokens.refresh_token;
            refreshing = (async () => {
                try {
                    const context = await deps.getRefreshContext?.();
                    await assertActor(request);
                    const { data } = await refreshClient.post(deps.refreshPath, { refresh_token: originalRefreshToken, isApp: true, ...context });
                    if (typeof data?.token !== 'string' || !data.token || typeof data?.refresh_token !== 'string' || !data.refresh_token)
                        throw new AppError('Resposta de renovação de sessão incompleta. Tente novamente.', { code: 'AUTH_REFRESH_INVALID_RESPONSE', retryable: true });
                    await assertActor(request);
                    if ((await deps.getTokens()).refresh_token !== originalRefreshToken) throw sessionChanged();
                    await deps.saveTokens({ token: data.token, refresh_token: data.refresh_token });
                    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
                    return data.token as string;
                } catch (refreshError: any) {
                    if ([401, 403].includes(refreshError?.response?.status)) return invalidate(request);
                    if (refreshError instanceof AppError) throw refreshError;
                    throw new AppError('Não foi possível renovar a conexão. As coletas estão salvas; tente sincronizar novamente.', {
                        status: refreshError?.response?.status,
                        code: 'AUTH_REFRESH_UNAVAILABLE',
                        retryable: true,
                    });
                } finally {
                    refreshing = null;
                }
            })();
        }
        return replay(request, await refreshing);
    });
    return () => {
        disposed = true;
        api.interceptors.request.eject(requestId);
        api.interceptors.response.eject(responseId);
    };
}
