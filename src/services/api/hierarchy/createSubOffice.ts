import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { QueryEnum } from '@constants/enums/query.enums';
import { StatusEnum } from '@constants/enums/status.enum';
import { IHierarchy } from '@interfaces/IHierarchy';
import { api } from '@services/api';
import { queryClient } from '@services/queryClient';
import { useMutation } from '@tanstack/react-query';

export interface IAutomateHierarchySubOffice {
    id?: string;
    name: string;
    realDescription?: string;
    status?: StatusEnum;
    companyId: string;
    employeesIds: number[];
    parentId?: string;
    organizeByOffice?: boolean;
}

export async function automateHierarchySubOffice(data: IAutomateHierarchySubOffice, companyId: string) {
    const response = await api.post<IHierarchy | IHierarchy[]>(`${ApiRoutesEnum.HIERARCHY}/sub-office/${companyId}`, {
        ...data,
        companyId,
    });

    return response.data;
}

export function useMutateCreateSubOffice() {
    return useMutation({
        mutationFn: async (data: IAutomateHierarchySubOffice) => automateHierarchySubOffice(data, data.companyId),
        onSuccess: async (resp) => {
            queryClient.invalidateQueries({ queryKey: [QueryEnum.HIERARCHY] });
            return resp;
        },
    });
}
