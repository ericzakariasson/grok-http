import { parseJsonOutput, toInput, toText } from "./porcelain.js";
import { mapUsage } from "./usage.js";
export class XaiResponse {
    id;
    status;
    output;
    incomplete_details;
    usage;
    http;
    object;
    created_at;
    completed_at;
    model;
    error;
    constructor(wire, http) {
        const rec = wire;
        Object.assign(this, rec);
        this.id = typeof rec.id === "string" ? rec.id : "";
        this.status = (typeof rec.status === "string" ? rec.status : "in_progress");
        this.output = Array.isArray(rec.output) ? rec.output : [];
        this.incomplete_details = rec.incomplete_details ?? null;
        this.usage = mapUsage(rec.usage);
        this.http = http;
    }
    get parsed() {
        return parseJsonOutput(this.output, this.status, false);
    }
    toText() {
        return toText(this.output);
    }
    toInput() {
        return toInput(this.output);
    }
    toJson() {
        return parseJsonOutput(this.output, this.status, true);
    }
}
//# sourceMappingURL=response.js.map