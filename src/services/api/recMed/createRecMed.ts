import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { QueryEnum } from '@constants/enums/query.enums';
import { IErrorResp } from '@interfaces/IApi';
import { IRecMed } from '@interfaces/IRecMed';
import { api } from '@services/api';
import { queryClient } from '@services/queryClient';
import { useMutation } from '@tanstack/react-query';
import { Alert } from 'react-native';

export interface ICreateRecMed extends Pick<IRecMed, 'riskId'> {
    id?: string;
    status?: string;
    medName?: string;
    redName?: string;
    companyId?: string;
    returnIfExist?: boolean;
    skipIfExist?: boolean;
}

export async function createRecMed(data: ICreateRecMed) {
    const response = await api.post<IRecMed>(`${ApiRoutesEnum.REC_MED}`, data);
    return response.data;
}

export function useMutCreateRecMed() {
    return useMutation({
        mutationFn: async (data: ICreateRecMed) => createRecMed(data),
        onSuccess: async (newRecMed) => {
            queryClient.invalidateQueries({ queryKey: [QueryEnum.REC_MED] });
            return newRecMed;
        },
        onError: (error: IErrorResp) => {
            // Alert.alert('Erro', error.response.data.message || 'Erro ao criar recomendação/medida', [
            //     {
            //         text: 'OK',
            //         style: 'cancel',
            //     },
            // ]);
        },
    });
}
