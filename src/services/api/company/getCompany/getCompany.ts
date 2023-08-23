import { ApiRoutesEnum } from '@constants/enums/api-routes.enums';
import { ICompany } from '@interfaces/ICompany';
import { api } from '@services/api';

export const getCompany = async (company: string) => {
    const response = await api.get<ICompany>(`${ApiRoutesEnum.COMPANIES}/${company}`);
    return response.data;
};
