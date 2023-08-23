/* eslint-disable @typescript-eslint/no-explicit-any */
export const emptyArrayReturn = async <T = any>() => {
    return [] as T[];
};

export const emptyMapReturn = async <T = any>() => {
    return {} as T;
};
