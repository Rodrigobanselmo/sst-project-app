import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { refreshToken } from '../user/refreshToken';
import { api } from '@services/api';
import { ICharacterization } from '@interfaces/ICharacterization';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@services/queryClient';

export interface IAddCharacterizationPhoto {
    id?: string;
    file: any;
    name: string;
    companyCharacterizationId: string;
    workspaceId: string;
    companyId: string;
}

export async function createCharacterizationPhoto(
    data: IAddCharacterizationPhoto,
    companyId: string,
    workspaceId: string,
) {
    const formData = new FormData();

    formData.append('file', data.file);
    formData.append('name', data.name);
    formData.append('companyCharacterizationId', data.companyCharacterizationId);

    const { token } = await refreshToken();

    const path =
        ApiRoutesEnum.CHARACTERIZATIONS.replace(':companyId', companyId).replace(':workspaceId', workspaceId) +
        '/photo';

    const response = await api.post<ICharacterization>(path, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
        },
    });

    return response.data;
}

export function useMutCreateCharacterizationPhoto() {
    return useMutation({
        mutationFn: async (data: IAddCharacterizationPhoto) =>
            createCharacterizationPhoto(data, data.companyId, data.workspaceId),
        onSuccess: async (resp) => {
            return resp;
        },
    });
}
