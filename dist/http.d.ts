import { DEFAULT_IDLE_TIMEOUT_MS, DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT_MS } from "./constants.js";
import type { HttpMeta, RequestOpts } from "./types.js";
import type { Xai } from "./client.js";
export declare function joinURL(base: string, path: string): string;
export declare function formatCurl(method: string, url: string, headers: Headers, body?: string): string;
export declare function combineSignals(signals: (AbortSignal | undefined)[]): AbortSignal | undefined;
export declare function retryDelayMs(attempt: number, retryAfter: string | null): number;
export declare function sleep(ms: number, signal?: AbortSignal): Promise<void>;
export type InternalRequest = {
    method: string;
    path: string;
    body?: unknown;
    query?: Record<string, string | number | undefined>;
    stream?: boolean;
    opts?: RequestOpts;
};
export type SendResult = {
    response: Response;
    http: HttpMeta;
    payload: unknown;
    body: ReadableStream<Uint8Array> | null;
    sawByte: boolean;
};
export declare function send(client: Xai, req: InternalRequest): Promise<SendResult>;
export { DEFAULT_IDLE_TIMEOUT_MS, DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT_MS };
//# sourceMappingURL=http.d.ts.map