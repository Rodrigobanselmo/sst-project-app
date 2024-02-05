import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { ICharacterization } from '@interfaces/ICharacterization';
import { api } from '@services/api';
import { useMutation } from '@tanstack/react-query';
import { refreshToken } from '../user/refreshToken';

export interface IAddCharacterizationFile {
    id?: string;
    file: File;
    companyCharacterizationId: string;
    workspaceId: string;
    companyId: string;
}

export async function createCharacterizationFile(
    data: IAddCharacterizationFile,
    companyId: string,
    workspaceId: string,
) {
    const formData = new FormData();

    formData.append('file', data.file);
    formData.append('companyCharacterizationId', data.companyCharacterizationId);

    const { token } = await refreshToken();

    const path =
        ApiRoutesEnum.CHARACTERIZATIONS.replace(':companyId', companyId).replace(':workspaceId', workspaceId) +
        '/files';

    const response = await api.post<ICharacterization>(path, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
        },
    });

    return response.data;
}

export function useMutCreateCharacterizationFile() {
    return useMutation({
        mutationFn: async (data: IAddCharacterizationFile) =>
            createCharacterizationFile(data, data.companyId, data.workspaceId),
        onSuccess: async (resp) => {
            return resp;
        },
    });
}
