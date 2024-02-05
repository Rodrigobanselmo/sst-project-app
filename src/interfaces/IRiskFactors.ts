import { IRecMed } from './IRecMed';
import { IGenerateSource } from './IGenerateSource';
import { RiskEnum } from '@constants/enums/risk.enum';
import { StatusEnum } from '@constants/enums/status.enum';
import { IRiskData } from './IRiskData';

export interface IRiskFactors {
    id: string;
    name: string;
    type: RiskEnum;
    system: boolean;
    severity: number;
    representAll: boolean;
    recMed: IRecMed[];
    generateSource: IGenerateSource[];
    companyId: string;
    appendix: string;
    propagation: string[];
    created_at: string;
    status: StatusEnum;
    exame?: string;
    symptoms?: string;
    method?: string;
    unit?: string;
    cas?: string;
    breather?: string;
    nr15lt?: string;
    vmp?: string;
    twa?: string;
    stel?: string;
    ipvs?: string;
    pv?: string;
    pe?: string;
    isEmergency?: boolean;
    carnogenicityACGIH?: string;
    carnogenicityLinach?: string;

    isAso: boolean;
    isPGR: boolean;
    isPCMSO: boolean;
    isPPP: boolean;

    riskFactorData?: IRiskData[];

    esocialCode: string;
}
