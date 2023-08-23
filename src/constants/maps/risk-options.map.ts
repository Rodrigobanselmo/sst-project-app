import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { RiskEnum } from '@constants/enums/risk.enum';

export enum RiskFilterEnum {
    ALL = 'Todos',
    BIO = 'Bio',
    QUI = 'Qui',
    FIS = 'Fis',
    ERG = 'Erg',
    ACI = 'Aci',
}

export interface IRiskOption {
    value: RiskFilterEnum | null;
    label: string;
    type: RiskEnum | null;
}

interface IRiskOptions extends Record<RiskFilterEnum, IRiskOption> {}

export const riskOptionsConstant: IRiskOptions = {
    [RiskFilterEnum.ALL]: {
        value: RiskFilterEnum.ALL,
        label: 'Todos',
        type: null,
    },
    [RiskFilterEnum.FIS]: {
        value: RiskFilterEnum.FIS,
        label: 'Fis',
        type: RiskEnum.FIS,
    },
    [RiskFilterEnum.QUI]: {
        value: RiskFilterEnum.QUI,
        label: 'Qui',
        type: RiskEnum.QUI,
    },
    [RiskFilterEnum.BIO]: {
        value: RiskFilterEnum.BIO,
        label: 'Bio',
        type: RiskEnum.BIO,
    },
    [RiskFilterEnum.ACI]: {
        value: RiskFilterEnum.ACI,
        label: 'Qui',
        type: RiskEnum.ACI,
    },
    [RiskFilterEnum.ERG]: {
        value: RiskFilterEnum.ERG,
        label: 'Eng',
        type: RiskEnum.ERG,
    },
};

export const riskOptionsList = [
    riskOptionsConstant[RiskFilterEnum.ALL],
    riskOptionsConstant[RiskFilterEnum.FIS],
    riskOptionsConstant[RiskFilterEnum.QUI],
    riskOptionsConstant[RiskFilterEnum.BIO],
    riskOptionsConstant[RiskFilterEnum.ACI],
    riskOptionsConstant[RiskFilterEnum.ERG],
];
