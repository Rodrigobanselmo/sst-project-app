import { MedTypeEnum, RecTypeEnum } from '@constants/enums/risk.enum';
import { StatusEnum } from '@constants/enums/status.enum';

export interface IRecMed {
    id: string;
    recName: string;
    medName: string;
    riskId: string;
    companyId: string;
    system: true;
    status: StatusEnum;
    medType?: MedTypeEnum;
    recType?: RecTypeEnum;
    created_at: string;
    isAll: boolean;
}

export interface IEngsRiskData {
    recMedId: string;
    riskFactorDataId?: string;
    efficientlyCheck?: boolean;
    recMed?: IRecMed;
}
