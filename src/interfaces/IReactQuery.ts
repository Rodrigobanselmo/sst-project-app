import { UseQueryResult } from '@tanstack/react-query';

export interface IReactQuery<T> extends Omit<UseQueryResult<T>, 'data'> {
    data: T;
}
export interface IReactQueryMany<T> extends Omit<UseQueryResult<T>, 'data'> {
    data: T;
    result: T;
}

export interface IPaginationResult<T> {
    data: T;
    count: number;
    error: { message?: string };
    countUnread?: number;
}

export interface IReactQueryPagination<T> extends Omit<UseQueryResult<T>, 'data'> {
    data: T;
    count: number;
    countUnread?: number;
}
