import { applyCreateDefaults, inlineBlobs } from "../porcelain.js";
import { send } from "../http.js";
import { XaiResponse } from "../response.js";
import { XaiStream } from "../stream.js";
export class Responses {
    client;
    inputItems;
    constructor(client) {
        this.client = client;
        this.inputItems = new InputItems(client);
    }
    async create(body, opts) {
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
        return new XaiResponse((result.payload ?? {}), result.http);
    }
    async get(id, opts) {
        const result = await send(this.client, {
            method: "GET",
            path: `/responses/${encodeURIComponent(id)}`,
            opts,
        });
        return new XaiResponse((result.payload ?? {}), result.http);
    }
    async delete(id, opts) {
        const result = await send(this.client, {
            method: "DELETE",
            path: `/responses/${encodeURIComponent(id)}`,
            opts,
        });
        const body = (result.payload ?? {});
        return Object.assign(body, { http: result.http });
    }
}
export class InputItems {
    client;
    constructor(client) {
        this.client = client;
    }
    async list(id, query = {}, opts) {
        const result = await send(this.client, {
            method: "GET",
            path: `/responses/${encodeURIComponent(id)}/input_items`,
            query,
            opts,
        });
        const body = (result.payload ?? { object: "list", data: [] });
        return Object.assign(body, { http: result.http });
    }
}
//# sourceMappingURL=responses.js.map