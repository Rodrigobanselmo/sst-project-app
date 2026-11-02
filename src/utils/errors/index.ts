export class AppError extends Error {
    readonly status?: number;
    readonly code?: string;
    readonly details?: unknown;
    readonly retryable?: boolean;

    constructor(message: unknown, options: { status?: number; code?: string; details?: unknown; retryable?: boolean } = {}) {
        super(Array.isArray(message) ? message.join('\n') : typeof message === 'string' ? message : 'Não foi possível concluir esta operação.');
        this.name = 'AppError';
        this.status = options.status;
        this.code = options.code;
        this.details = options.details;
        this.retryable = options.retryable;
    }
}
