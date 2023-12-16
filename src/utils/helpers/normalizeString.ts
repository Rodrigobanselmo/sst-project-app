export const normalizeString = (str?: string): string => {
    if (!str) return '';

    return str
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim();
};
