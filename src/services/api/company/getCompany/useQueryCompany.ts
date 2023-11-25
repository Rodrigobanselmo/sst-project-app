import { QueryEnum } from '@constants/enums/query.enums';
import { useAuth } from '@hooks/useAuth';
import { ICompany } from '@interfaces/ICompany';
import { IReactQuery } from '@interfaces/IReactQuery';
import { useQuery } from '@tanstack/react-query';
import { emptyMapReturn } from '@utils/helpers/emptyFunc';
import { getCompany } from './getCompany';

export function useQueryCompany(getCompanyId?: string | null): IReactQuery<ICompany> {
    const { user } = useAuth();
    const companyID = getCompanyId || user?.companyId;

    const { data, ...query } = useQuery({
        queryKey: [QueryEnum.COMPANY, companyID],
        queryFn: () => (companyID ? getCompany(companyID) : <Promise<ICompany>>emptyMapReturn()),
        staleTime: 1000 * 60 * 60, // 60 minute
    });

    return { ...query, data: data || ({} as unknown as ICompany) };
}
