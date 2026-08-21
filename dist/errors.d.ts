declare const BRAND: unique symbol;
type ErrorInit = {
    request_id?: string | null;
    status?: number;
    code?: string | null;
    body?: unknown;
    cause?: unknown;
};
export declare class APIError extends Error {
    readonly request_id: string | null;
    readonly status: number | undefined;
    readonly code: string | null;
    readonly body: unknown;
    readonly [BRAND]: true;
    constructor(message: string, init?: ErrorInit);
    static is(err: unknown): err is APIError;
    isRateLimit(): boolean;
    isOverloaded(): boolean;
    isAbort(): boolean;
}
export declare class APIConnectionError extends APIError {
    constructor(message?: string, init?: ErrorInit);
}
export declare class TimeoutError extends APIError {
    constructor(message?: string, init?: ErrorInit);
}
export declare class AbortError extends APIError {
    constructor(message?: string, init?: ErrorInit);
}
export declare class APIStatusError extends APIError {
    readonly status: number;
    constructor(message: string, init: ErrorInit & {
        status: number;
    });
}
export declare class AuthenticationError extends APIStatusError {
    constructor(message?: string, init?: ErrorInit);
}
export declare class PermissionDeniedError extends APIStatusError {
    constructor(message?: string, init?: ErrorInit);
}
export declare class NotFoundError extends APIStatusError {
    constructor(message?: string, init?: ErrorInit);
}
export declare class RateLimitError extends APIStatusError {
    constructor(message?: string, init?: ErrorInit);
}
export declare class OverloadedError extends APIStatusError {
    constructor(message?: string, init?: ErrorInit);
}
export declare function rewriteStatusMessage(status: number, message: string): string;
export declare function requestIdFromHeaders(headers: Headers): string | null;
export declare function errorFromStatus(status: number, message: string, init?: ErrorInit): APIStatusError;
export declare function errorFromResponse(res: Response, body?: unknown): Promise<APIStatusError>;
export declare function errorFromAbort(signal: AbortSignal, request_id: string | null): APIError;
export declare function errorFromUnknown(err: unknown, request_id: string | null): APIError;
export declare function isTimeoutLike(err: unknown): boolean;
export declare function isAbortLike(err: unknown): boolean;
export declare function streamErrorEvent(raw: Record<string, unknown>, request_id: string | null): {
    event: Record<string, unknown>;
    error: APIError;
};
export {};
//# sourceMappingURL=errors.d.ts.map