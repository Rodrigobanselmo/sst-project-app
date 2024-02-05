import { IEpi } from './IEpi';
import { IGenerateSource } from './IGenerateSource';
import { IGho } from './IGho';
import { IHierarchy } from './IHierarchy';
import { IRecMed } from './IRecMed';
import { IRiskFactors } from './IRiskFactors';

export interface IRiskData {
    id: string;
    probability?: number;
    probabilityAfter?: number;
    companyId: string;
    riskId: string;
    homogeneousGroupId?: string;
    endDate?: Date;
    startDate?: Date;
    hierarchyId?: string;
    riskFactorGroupDataId: string;
    hierarchy?: IHierarchy;
    homogeneousGroup?: IGho;
    generateSources?: IGenerateSource[];
    adms?: IRecMed[];
    recs?: IRecMed[];
    engs?: IRecMed[];
    epis?: IEpi[];
    isQuantity?: boolean;
    standardExams?: boolean;
    riskFactor?: IRiskFactors;
    origin?: string;
    ro?: string;
    level?: number;
    intervention?: string;
    created_at: Date;
    updated_at: Date;
}
