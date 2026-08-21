import { ModelsResource } from "./resources/models.js";
import { Responses } from "./resources/responses.js";
import type { ClientOptions, RequestHook, ResponseHook } from "./types.js";
export declare class Xai {
    readonly apiKey: string;
    readonly baseURL: string;
    readonly timeout: number;
    readonly idleTimeout: number;
    /** Retry count (jitter + Retry-After). Default 2. Streams retry only before the first SSE byte. */
    readonly maxRetries: number;
    readonly defaultHeaders: Record<string, string>;
    readonly fetch: typeof fetch;
    readonly onRequest?: RequestHook;
    readonly onResponse?: ResponseHook;
    readonly responses: Responses;
    readonly models: ModelsResource;
    constructor(opts?: ClientOptions);
}
//# sourceMappingURL=client.d.ts.map