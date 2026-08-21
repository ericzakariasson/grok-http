import type { Model, ModelList, RequestOpts } from "../types.js";
import type { Xai } from "../client.js";
export declare class ModelsResource {
    private readonly client;
    constructor(client: Xai);
    list(opts?: RequestOpts): Promise<ModelList & {
        http: import("../types.js").HttpMeta;
    }>;
    get(id: string, opts?: RequestOpts): Promise<Model & {
        http: import("../types.js").HttpMeta;
    }>;
}
//# sourceMappingURL=models.d.ts.map