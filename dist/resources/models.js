import { send } from "../http.js";
export class ModelsResource {
    client;
    constructor(client) {
        this.client = client;
    }
    async list(opts) {
        const result = await send(this.client, {
            method: "GET",
            path: "/models",
            opts,
        });
        const body = (result.payload ?? { object: "list", data: [] });
        return Object.assign(body, { http: result.http });
    }
    async get(id, opts) {
        const result = await send(this.client, {
            method: "GET",
            path: `/models/${encodeURIComponent(id)}`,
            opts,
        });
        const body = (result.payload ?? {});
        return Object.assign(body, { http: result.http });
    }
}
//# sourceMappingURL=models.js.map