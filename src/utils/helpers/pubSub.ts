type Callback<T> = (data: T) => void;

export enum PubSubEventsEnum {
    LOADING_PAGE = 'LOADING_PAGE',
}

type Subscribers = {
    [PubSubEventsEnum.LOADING_PAGE]: boolean;
};

class PubSub {
    private subscribers: { [event: string]: Array<Callback<any>> } = {};

    subscribe<T, R extends PubSubEventsEnum>(event: R, callback: Callback<Subscribers[R]>): () => void {
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }
        this.subscribers[event].push(callback);
        const index = this.subscribers[event].length - 1;

        return () => {
            this.subscribers[event].splice(index, 1);
        };
    }

    publish<T>(event: string, data: T): void {
        if (this.subscribers[event]) {
            this.subscribers[event].forEach((callback) => callback(data));
        }
    }
}

export const pubSub = new PubSub();
