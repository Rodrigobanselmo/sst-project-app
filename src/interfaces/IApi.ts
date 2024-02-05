interface IHeaders extends Record<string, unknown> {
    'content-type': string;
    'content-length': string;
}

interface ConfigHeaders {
    Accept: string;
    'Content-Type': string;
    Authorization: string;
}

interface Transitional {
    silentJSONParsing: boolean;
    forcedJSONParsing: boolean;
    clarifyTimeoutError: boolean;
}

interface Config {
    transitional: Transitional;
    transformRequest: null[];
    transformResponse: null[];
    timeout: number;
    xsrfCookieName: string;
    xsrfHeaderName: string;
    maxContentLength: number;
    maxBodyLength: number;
    headers: ConfigHeaders;
    baseURL: string;
    method: string;
    url: string;
    data: string;
}

export interface IErrorResp {
    message: string;
    error: string;
    statusCode: number;
}
