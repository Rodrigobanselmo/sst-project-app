/* eslint-disable @typescript-eslint/no-explicit-any */

interface IDuplicateOptions {
    removeById?: string;
}

export function removeDuplicate<T>(array: T[]) {
    return array.filter((item, index, self) => index === self.findIndex((t) => t == item));
}

export function removeDuplicateById<T extends Record<string, any>>(array: T[], options?: IDuplicateOptions) {
    return array.filter((item, index, self) => {
        const id = options?.removeById || 'id';
        return index === self.findIndex((t) => t[id] == item[id]);
    });
}
