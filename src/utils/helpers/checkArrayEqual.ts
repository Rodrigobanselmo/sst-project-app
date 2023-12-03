export function checkArrayEqual<T>({
    arr1,
    arr2,
    getProperty,
}: {
    arr1: T[];
    arr2: T[];
    getProperty: (item: T) => any;
}) {
    if (arr1.length !== arr2.length) {
        return false;
    }

    const idsInArr2 = new Set(arr2.map((item) => getProperty(item)));

    for (const item of arr1) {
        if (!idsInArr2.has(getProperty(item))) {
            return false;
        }
    }

    return true;
}
