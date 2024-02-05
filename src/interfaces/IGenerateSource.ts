import { StatusEnum } from '@constants/enums/status.enum';

export interface IGenerateSource {
    id: string;
    name: string;
    riskId: string;
    companyId: string;
    system: true;
    status: StatusEnum;
    created_at: string;
    isAll: boolean;
}
