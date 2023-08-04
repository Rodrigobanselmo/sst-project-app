import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';

export interface ICharacterizationType {
    value: CharacterizationTypeEnum;
    name: string;
    description: string;
    type: string;
}
export interface ICharacterizationMap extends Record<CharacterizationTypeEnum, ICharacterizationType> {}

export const characterizationMap: ICharacterizationMap = {
    [CharacterizationTypeEnum.WORKSTATION]: {
        value: CharacterizationTypeEnum.WORKSTATION,
        name: 'Posto de trabalho',
        type: '',
        description: 'Posto de trabalho (local onde o empregado passa sua jornada de trabalho)',
    },
    [CharacterizationTypeEnum.ACTIVITIES]: {
        value: CharacterizationTypeEnum.ACTIVITIES,
        type: '',
        name: 'Atividades',
        description: 'Atividades com fatores de risco/perigo inerentes à ela',
    },
    [CharacterizationTypeEnum.EQUIPMENT]: {
        value: CharacterizationTypeEnum.EQUIPMENT,
        type: '',
        name: 'Equipamento',
        description: 'Equipamentos com fatores de risco/perigo inerentes à ele',
    },
    [CharacterizationTypeEnum.ADMINISTRATIVE]: {
        value: CharacterizationTypeEnum.ADMINISTRATIVE,
        type: 'Ambiente',
        name: 'Administrativo',
        description:
            'Nos ambientes administrativos são executadas atividades diversas sem relação direta com o processo produtivo e pouco relacionadas com riscos físicos, químicos e biológicos, mas é possível encontrar alguns fatores de riscos ergonômicos e até mesmo de acidentes, no entanto de baixa severidade.',
    },
    [CharacterizationTypeEnum.OPERATION]: {
        value: CharacterizationTypeEnum.OPERATION,
        type: 'Ambiente',
        name: 'Operacional',
        description:
            'Nos ambientes operacionais são executadas atividades que resultam no produto ou serviço fim da empresa, ou seja, onde ocorre o processo produtivo, normalmente são os ambientes de maior concentração de Fatores de Riscos e Perigos envolvendo quase sempre exposições primárias e secundárias.',
    },
    [CharacterizationTypeEnum.SUPPORT]: {
        value: CharacterizationTypeEnum.SUPPORT,
        type: 'Ambiente de',
        name: 'Apoio',
        description:
            'Nos ambientes de apoio são executadas atividades que dão suporte às atividades operacionais da empresa, normalmente envolvem Fatores de Riscos e Perigos característicos ao que é executado nos seus posto de trabalho gerando exposições primárias, são exemplos os seguintes ambientes: Oficinas diversa, laboratórios, estações de tratamento (efluentes), pátios de resíduos, etc.',
    },
    [CharacterizationTypeEnum.GENERAL]: {
        value: CharacterizationTypeEnum.GENERAL,
        type: 'Ambiente',
        name: 'Visão Geral',
        description:
            'Nos ambientes considerados gerais são aqueles que não possuem uma destinação específica e certamente são isentos de riscos próprios, envolve áreas comuns de circulação e normalmente sem restrição de acesso ao público, tais como: Fachada da empresa, Roll de entrada, ambientes de espera, pátios, áreas de recreação, etc.',
    },
};
