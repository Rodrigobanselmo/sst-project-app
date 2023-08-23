import { RiskEnum } from '@constants/enums/risk.enum';

export const riskMap: Record<RiskEnum, { type: RiskEnum; name: string }> = {
    [RiskEnum.FIS]: {
        type: RiskEnum.FIS,
        name: 'Físico',
    },
    [RiskEnum.QUI]: {
        type: RiskEnum.QUI,
        name: 'Químico',
    },
    [RiskEnum.BIO]: {
        type: RiskEnum.BIO,
        name: 'Biológico',
    },
    [RiskEnum.ERG]: {
        type: RiskEnum.ERG,
        name: 'Ergonômico',
    },
    [RiskEnum.ACI]: {
        type: RiskEnum.ACI,
        name: 'Acidente',
    },
    [RiskEnum.OUTROS]: {
        type: RiskEnum.OUTROS,
        name: 'Outros',
    },
};
