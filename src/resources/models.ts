import { send } from "../http.js";
import type { Model, ModelList, RequestOpts } from "../types.js";
import type { Xai } from "../client.js";

export class ModelsResource {
  constructor(private readonly client: Xai) {}

  async list(opts?: RequestOpts): Promise<ModelList & { http: import("../types.js").HttpMeta }> {
    const result = await send(this.client, {
      method: "GET",
      path: "/models",
      opts,
    });
    const body = (result.payload ?? { object: "list", data: [] }) as ModelList;
    return Object.assign(body, { http: result.http });
  }

  async get(id: string, opts?: RequestOpts): Promise<Model & { http: import("../types.js").HttpMeta }> {
    const result = await send(this.client, {
      method: "GET",
      path: `/models/${encodeURIComponent(id)}`,
      opts,
    });
    const body = (result.payload ?? {}) as Model;
    return Object.assign(body, { http: result.http });
  }
}
