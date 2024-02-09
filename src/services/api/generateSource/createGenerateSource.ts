import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { QueryEnum } from '@constants/enums/query.enums';
import { IGenerateSource } from '@interfaces/IGenerateSource';
import { api } from '@services/api';
import { queryClient } from '@services/queryClient';
import { useMutation } from '@tanstack/react-query';

export interface ICreateGenerateSource extends Pick<IGenerateSource, 'riskId'> {
    id?: string;
    status?: string;
    name?: string;
    recMeds?: { recName: string; medName: string; medType: string }[];
    companyId: string;
    returnIfExist?: boolean;
}

export async function createGenerateSource(data: ICreateGenerateSource) {
    const response = await api.post<IGenerateSource>(ApiRoutesEnum.GENERATE_SOURCE, data);

    return response.data;
}

export function useMutCreateGenerateSource() {
    return useMutation({
        mutationFn: async (data: ICreateGenerateSource) => createGenerateSource(data),
        onSuccess: async (newGenerateSource) => {
            queryClient.invalidateQueries({ queryKey: [QueryEnum.GENERATE_SOURCE] });
            return newGenerateSource;
        },
    });
}
