import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { StatusEnum } from '@constants/enums/status.enum';
import { api } from '@services/api';
import { refreshToken } from '../user/refreshToken';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@services/queryClient';
import { QueryEnum } from '@constants/enums/query.enums';
import { ICharacterization } from '@interfaces/ICharacterization';

export interface IAddCharacterizationPhoto {
    file?: File;
    name?: string;
    id?: string;
    photoUrl: string;
    updated_at?: Date;
}

export interface IUpsertCharacterization {
    id?: string;
    type?: CharacterizationTypeEnum;
    hierarchyIds?: string[];
    paragraphs?: string[];
    name?: string;
    description?: string;
    order?: number;
    companyId: string;
    noiseValue?: string;
    temperature?: string;
    luminosity?: string;
    moisturePercentage?: string;
    workspaceId: string;
    considerations?: string[];
    activities?: string[];
    profileParentId?: string;
    profileName?: string;
    startDate?: Date;
    endDate?: Date;
    status?: StatusEnum;
    photos?: IAddCharacterizationPhoto[];
}

export async function updateCharacterization(data: IUpsertCharacterization, companyId: string, workspaceId: string) {
    const formData = new FormData();
    formData.append('createWithId', 'true');

    data.photos?.forEach((photo) => {
        if (photo.file) formData.append('files[]', photo.file);
        if (photo.name) formData.append('photos[]', photo.name);
    });

    delete data.photos;

    Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return formData.append(`${key}[]`, '');
            }
            return value.forEach((item) => {
                formData.append(`${key}[]`, item);
            });
        }

        if (value || value === '') formData.append(key, value);
    });

    const { token } = await refreshToken();

    const path = ApiRoutesEnum.CHARACTERIZATIONS.replace(':companyId', companyId).replace(':workspaceId', workspaceId);

    const response = await api.post<ICharacterization>(path, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
        },
    });
    return response.data;
}

export function useMutUpsertCharacterization() {
    return useMutation({
        mutationFn: async (data: IUpsertCharacterization) =>
            updateCharacterization(data, data.companyId, data.workspaceId),
        onSuccess: async (resp) => {
            if (resp) {
                queryClient.invalidateQueries({ queryKey: [QueryEnum.GHO] });
                return resp;
            }

            return resp;
        },
    });
}
