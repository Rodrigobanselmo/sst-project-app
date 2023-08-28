import { THEME } from '../../theme/theme';

export const matrixRiskMap = {
    [0]: {
        label: 'Não informado',
        short: 'NA',
        level: 0,
        color: 'transparent',
    },
    [1]: {
        label: 'Muito baixo',
        short: 'MB',
        level: 1,
        color: THEME.colors.scale.low,
    },
    [2]: {
        label: 'Baixo',
        short: 'B',
        level: 2,
        color: THEME.colors.scale.mediumLow,
    },
    [3]: {
        label: 'Moderado',
        short: 'M',
        level: 3,
        color: THEME.colors.scale.medium,
    },
    [4]: {
        label: 'Alto',
        short: 'A',
        level: 4,
        color: THEME.colors.scale.mediumHigh,
    },
    [5]: {
        label: 'Muito Alto',
        short: 'MA',
        level: 5,
        color: THEME.colors.scale.high,
    },
    [6]: {
        label: 'Interromper',
        short: 'IA',
        level: 6,
        color: 'black',
    },
};

export const matrixRisk = [
    [2, 3, 4, 5, 5, 6],
    [2, 3, 3, 4, 5, 6],
    [2, 2, 3, 3, 4, 6],
    [1, 2, 2, 3, 3, 6],
    [1, 1, 2, 2, 2, 6],
];
