export const isNaEpi = (ca: string) => ['1', '2', '0'].includes(ca);

export const isNaRecMed = (name: string) =>
    ['Não aplicável', 'Não Identificada', 'Não verificada', 'Não implementada'].includes(name);

export const convertCaToDescription = (ca: string) => {
    switch (ca) {
        case '0':
            return 'Não aplicável';
        case '1':
            return 'Não implementada';
        case '2':
            return 'Não verificada';
        default:
            return ca;
    }
};
