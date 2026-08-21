import { applyCreateDefaults, inlineBlobs } from "../porcelain.js";
import { send } from "../http.js";
import { XaiResponse } from "../response.js";
import { XaiStream } from "../stream.js";
import type { CreateParams, RequestOpts } from "../types.js";
import type { DeletedResponse, InputItemList } from "../types.js";
import type { Xai } from "../client.js";

export class Responses {
  readonly inputItems: InputItems;

  constructor(private readonly client: Xai) {
    this.inputItems = new InputItems(client);
  }

  /**
   * Create a response.
   *
   * `store` SDK default is false. The API wire default is true (stored 30 days).
   * When `store` is false and `include` is unset, sends `['reasoning.encrypted_content']`.
   */
  create(body: CreateParams & { stream: true }, opts?: RequestOpts): Promise<XaiStream>;
  create(body: CreateParams & { stream?: false }, opts?: RequestOpts): Promise<XaiResponse>;
  create(body: CreateParams, opts?: RequestOpts): Promise<XaiResponse | XaiStream>;
  async create(body: CreateParams, opts?: RequestOpts): Promise<XaiResponse | XaiStream> {
    const input = await inlineBlobs(body.input);
    const payload = applyCreateDefaults({ ...body, input });
    const stream = payload.stream === true;
    const result = await send(this.client, {
      method: "POST",
      path: "/responses",
      body: payload,
      stream,
      opts,
    });
    if (stream) {
      return new XaiStream({
        body: result.body,
        http: result.http,
        signal: opts?.signal,
      });
    }
    return new XaiResponse((result.payload ?? {}) as Record<string, unknown>, result.http);
  }

  async get(id: string, opts?: RequestOpts): Promise<XaiResponse> {
    const result = await send(this.client, {
      method: "GET",
      path: `/responses/${encodeURIComponent(id)}`,
      opts,
    });
    return new XaiResponse((result.payload ?? {}) as Record<string, unknown>, result.http);
  }

  async delete(id: string, opts?: RequestOpts): Promise<DeletedResponse & { http: import("../types.js").HttpMeta }> {
    const result = await send(this.client, {
      method: "DELETE",
      path: `/responses/${encodeURIComponent(id)}`,
      opts,
    });
    const body = (result.payload ?? {}) as DeletedResponse;
    return Object.assign(body, { http: result.http });
  }
}

export class InputItems {
  constructor(private readonly client: Xai) {}

  async list(
    id: string,
    opts: RequestOpts & { after?: string; before?: string; limit?: number } = {},
  ): Promise<InputItemList & { http: import("../types.js").HttpMeta }> {
    const { after, before, limit, ...requestOpts } = opts;
    const result = await send(this.client, {
      method: "GET",
      path: `/responses/${encodeURIComponent(id)}/input_items`,
      query: { after, before, limit },
      opts: requestOpts,
    });
    const body = (result.payload ?? { object: "list", data: [] }) as InputItemList;
    return Object.assign(body, { http: result.http });
  }
}
