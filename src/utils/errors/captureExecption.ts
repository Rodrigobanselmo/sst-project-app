import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { api } from '@services/api';

export async function captureExeption(error: any) {
    try {
        await api.put(`/log-error-app`, { error });
    } catch (e) {
        //
    }
}

export async function captureLog(error: any) {
    try {
        await api.put(`/log-app`, { error });
    } catch (e) {
        //
    }
}
