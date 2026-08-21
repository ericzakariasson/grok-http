import { XaiResponse } from "../response.js";
import { XaiStream } from "../stream.js";
import type { CreateParams, RequestOpts } from "../types.js";
import type { DeletedResponse, InputItemList } from "../types.js";
import type { Xai } from "../client.js";
export declare class Responses {
    private readonly client;
    readonly inputItems: InputItems;
    constructor(client: Xai);
    /**
     * Create a response.
     *
     * `store` SDK default is false. The API wire default is true (stored 30 days).
     * When `store` is false and `include` is unset, sends `['reasoning.encrypted_content']`.
     */
    create(body: CreateParams & {
        stream: true;
    }, opts?: RequestOpts): Promise<XaiStream>;
    create(body: CreateParams & {
        stream?: false;
    }, opts?: RequestOpts): Promise<XaiResponse>;
    create(body: CreateParams, opts?: RequestOpts): Promise<XaiResponse | XaiStream>;
    get(id: string, opts?: RequestOpts): Promise<XaiResponse>;
    delete(id: string, opts?: RequestOpts): Promise<DeletedResponse & {
        http: import("../types.js").HttpMeta;
    }>;
}
export declare class InputItems {
    private readonly client;
    constructor(client: Xai);
    list(id: string, query?: {
        after?: string;
        before?: string;
        limit?: number;
    }, opts?: RequestOpts): Promise<InputItemList & {
        http: import("../types.js").HttpMeta;
    }>;
}
//# sourceMappingURL=responses.d.ts.map