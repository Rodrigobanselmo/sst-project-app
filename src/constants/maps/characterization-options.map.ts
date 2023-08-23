import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';

export enum CharacterizationEnum {
    ALL = 'todos',
    SUPPORT = 'apoio',
    OPERATION = 'operacional',
    ADM = 'administrativo',
    ENVIRONMENT = 'ambiente',
    LABOR = 'mão-de-obra',
    WORKSTATION = 'posto-de-trabaho',
    EQUIPMENT = 'equipamentos',
    ACTIVITIES = 'atividades',
}

export interface ICharacterizationOption {
    value: CharacterizationEnum;
    title: string;
    label: string;
    route: string;
    type: CharacterizationTypeEnum | null;
}

interface ICharacterizationOptions extends Record<CharacterizationEnum, ICharacterizationOption> {}

export const characterizationOptionsConstant: ICharacterizationOptions = {
    [CharacterizationEnum.ALL]: {
        value: CharacterizationEnum.ALL,
        title: 'Todos',
        label: 'Todos',
        route: CharacterizationEnum.ALL,
        type: null,
    },
    [CharacterizationEnum.ADM]: {
        value: CharacterizationEnum.ADM,
        title: 'Ambientes Administrativos',
        label: 'Amb. Administrativo',
        route: CharacterizationEnum.ADM,
        type: CharacterizationTypeEnum.ADMINISTRATIVE,
    },
    [CharacterizationEnum.ENVIRONMENT]: {
        value: CharacterizationEnum.ENVIRONMENT,
        title: 'Ambientes de Trabalho',
        label: 'Amb. de Trabalho',
        route: 'ambiente',
        type: CharacterizationTypeEnum.ADMINISTRATIVE,
    },
    [CharacterizationEnum.OPERATION]: {
        value: CharacterizationEnum.OPERATION,
        title: 'Ambientes Operacionais',
        label: 'Amb. Operacional',
        route: CharacterizationEnum.OPERATION,
        type: CharacterizationTypeEnum.OPERATION,
    },
    [CharacterizationEnum.SUPPORT]: {
        value: CharacterizationEnum.SUPPORT,
        title: 'Ambientes de Apoio',
        label: 'Amb. de Apoio',
        route: CharacterizationEnum.SUPPORT,
        type: CharacterizationTypeEnum.SUPPORT,
    },
    [CharacterizationEnum.ACTIVITIES]: {
        value: CharacterizationEnum.ACTIVITIES,
        title: 'Atividade',
        label: 'Atividade',
        route: 'atividades',
        type: CharacterizationTypeEnum.ACTIVITIES,
    },
    [CharacterizationEnum.LABOR]: {
        value: CharacterizationEnum.LABOR,
        title: 'Mão de obra',
        label: 'Mão de obra',
        route: CharacterizationEnum.LABOR,
        type: CharacterizationTypeEnum.ACTIVITIES,
    },
    [CharacterizationEnum.EQUIPMENT]: {
        value: CharacterizationEnum.EQUIPMENT,
        title: 'Equipamentos',
        label: 'Equipamentos',
        route: 'equipamentos',
        type: CharacterizationTypeEnum.EQUIPMENT,
    },
    [CharacterizationEnum.WORKSTATION]: {
        value: CharacterizationEnum.WORKSTATION,
        title: 'Posto de Trabalho',
        label: 'Posto de Trabalho',
        route: 'posto-de-trabalho',
        type: CharacterizationTypeEnum.WORKSTATION,
    },
};

export const characterizationOptionsList = [
    characterizationOptionsConstant[CharacterizationEnum.ALL],
    characterizationOptionsConstant[CharacterizationEnum.ADM],
    characterizationOptionsConstant[CharacterizationEnum.OPERATION],
    characterizationOptionsConstant[CharacterizationEnum.SUPPORT],
    characterizationOptionsConstant[CharacterizationEnum.WORKSTATION],
    characterizationOptionsConstant[CharacterizationEnum.ACTIVITIES],
    characterizationOptionsConstant[CharacterizationEnum.EQUIPMENT],
];
