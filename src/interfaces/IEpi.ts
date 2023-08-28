import { StatusEnum } from '@constants/enums/status.enum';

export interface IEpi {
    id: number;
    ca: string;
    created_at: Date;
    expiredDate: Date;
    status: StatusEnum;
    observation: string;
    equipment: string;
    description: string;
    report: string;
    restriction: string;
    isValid: boolean;
    national: boolean;
    epiRiskData: IEpiRiskData;
}

export interface IEpiRiskData {
    epiId: number;
    riskFactorDataId?: string;
    lifeTimeInDays?: number;
    efficientlyCheck?: boolean;
    epcCheck?: boolean;
    longPeriodsCheck?: boolean;
    validationCheck?: boolean;
    tradeSignCheck?: boolean;
    sanitationCheck?: boolean;
    maintenanceCheck?: boolean;
    unstoppedCheck?: boolean;
    trainingCheck?: boolean;
    epi?: IEpi;
}
