export enum DeduplicationEnum {
    REFRESH = 'REFRESH',
}

class RequestDeduplicator {
    private requestCache: Map<string, Promise<any>>;

    constructor() {
        this.requestCache = new Map();
    }

    async execute<T>(requestFunction: () => Promise<T>, key: string): Promise<T> {
        if (this.requestCache.has(key)) {
            return this.requestCache.get(key)!;
        }

        const promise = requestFunction().finally(() => {
            this.requestCache.delete(key);
        });

        this.requestCache.set(key, promise);
        return promise;
    }
}

export const deduplicator = new RequestDeduplicator();
