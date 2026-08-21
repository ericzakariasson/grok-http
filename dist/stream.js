import { isKnownStreamEventType } from "./constants.js";
import { APIError, OverloadedError, TimeoutError, errorFromUnknown, streamErrorEvent, } from "./errors.js";
import { parseSse } from "./sse.js";
import { parseJsonOutput, toInput, toText } from "./porcelain.js";
import { emptyUsage, mapUsage } from "./usage.js";
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
export class XaiStream {
    id = "";
    status = "in_progress";
    output = [];
    incomplete_details = null;
    usage = emptyUsage();
    http;
    error = null;
    model;
    #body;
    #closed = false;
    #consumed = false;
    #requestId;
    #signal;
    constructor(init) {
        this.http = init.http;
        this.#body = init.body;
        this.#requestId = init.http.requestId;
        this.#signal = init.signal;
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
    async close() {
        if (this.#closed)
            return;
        this.#closed = true;
        const body = this.#body;
        this.#body = null;
        if (body) {
            try {
                await body.cancel();
            }
            catch {
                // already cancelled
            }
        }
    }
    async [Symbol.asyncDispose]() {
        await this.close();
    }
    async *[Symbol.asyncIterator]() {
        if (this.#consumed)
            throw new Error("Stream already iterated");
        this.#consumed = true;
        if (!this.#body)
            return;
        try {
            for await (const raw of parseSse(this.#body)) {
                const event = this.#normalize(raw);
                this.#apply(event);
                yield event;
            }
            if (this.status === "completed")
                this.usage = mapUsage(this.usage);
        }
        catch (err) {
            const mapped = this.#signal?.aborted
                ? errorFromUnknown(this.#signal.reason ?? err, this.#requestId)
                : errorFromUnknown(err, this.#requestId);
            if (mapped instanceof TimeoutError) {
                const event = {
                    type: "error",
                    message: mapped.message,
                    error: mapped,
                };
                this.error = mapped;
                this.status = "failed";
                yield event;
            }
            throw mapped;
        }
        finally {
            await this.close();
        }
    }
    #normalize(raw) {
        if (!isRecord(raw))
            return { type: "unknown", raw };
        const type = raw.type;
        if (type === "error") {
            const { event } = streamErrorEvent(raw, this.#requestId);
            this.error = event.error ?? this.error;
            return event;
        }
        if (typeof type === "string" && isKnownStreamEventType(type)) {
            return raw;
        }
        return { type: "unknown", raw };
    }
    #apply(event) {
        switch (event.type) {
            case "response.created":
            case "response.in_progress":
            case "response.completed":
            case "response.failed":
            case "response.incomplete":
                this.#assignResponse(event.response);
                break;
            case "response.output_item.added":
            case "response.output_item.done": {
                const e = event;
                this.#setItem(e.output_index, e.item);
                break;
            }
            case "response.content_part.added":
            case "response.content_part.done": {
                const e = event;
                this.#setPart(e.output_index, e.content_index, e.part);
                break;
            }
            case "response.output_text.delta": {
                const e = event;
                this.#appendText(e.output_index ?? 0, e.content_index ?? 0, e.delta);
                break;
            }
            case "response.output_text.done": {
                const e = event;
                this.#setText(e.output_index ?? 0, e.content_index ?? 0, e.text);
                break;
            }
            case "response.reasoning_text.delta": {
                const e = event;
                this.#appendReasoningText(e.output_index ?? 0, e.content_index ?? 0, e.delta);
                break;
            }
            case "response.reasoning_text.done": {
                const e = event;
                if (typeof e.text === "string")
                    this.#setReasoningText(e.output_index ?? 0, e.content_index ?? 0, e.text);
                break;
            }
            case "response.reasoning_summary_text.delta": {
                const e = event;
                this.#appendReasoningSummary(e.output_index ?? 0, e.summary_index ?? 0, e.delta);
                break;
            }
            case "response.reasoning_summary_text.done": {
                const e = event;
                if (typeof e.text === "string") {
                    this.#setReasoningSummary(e.output_index ?? 0, e.summary_index ?? 0, e.text);
                }
                break;
            }
            case "response.function_call_arguments.delta": {
                const e = event;
                this.#appendArgs(e.output_index ?? 0, e.delta);
                break;
            }
            case "response.function_call_arguments.done": {
                const e = event;
                this.#setArgs(e.output_index ?? 0, e.arguments);
                break;
            }
            case "error": {
                const err = event.error;
                if (err instanceof OverloadedError || err instanceof TimeoutError)
                    this.status = "failed";
                break;
            }
            default:
                break;
        }
    }
    #assignResponse(response) {
        if (!isRecord(response))
            return;
        if (typeof response.id === "string")
            this.id = response.id;
        if (typeof response.status === "string")
            this.status = response.status;
        if (typeof response.model === "string")
            this.model = response.model;
        if (Array.isArray(response.output))
            this.output = response.output;
        if ("incomplete_details" in response) {
            this.incomplete_details = response.incomplete_details ?? null;
        }
        if (response.error !== undefined)
            this.error = response.error;
        if (response.usage !== undefined || response.status === "completed") {
            this.usage = mapUsage(response.usage);
        }
    }
    #ensureItem(index) {
        while (this.output.length <= index) {
            this.output.push({ type: "message", role: "assistant", content: [] });
        }
        const item = this.output[index];
        if (!isRecord(item)) {
            const next = { type: "message", role: "assistant", content: [] };
            this.output[index] = next;
            return next;
        }
        return item;
    }
    #setItem(index, item) {
        while (this.output.length < index) {
            this.output.push({ type: "message", role: "assistant", content: [] });
        }
        this.output[index] = item;
    }
    #setPart(index, contentIndex, part) {
        const item = this.#ensureItem(index);
        const content = Array.isArray(item.content) ? [...item.content] : [];
        while (content.length < contentIndex)
            content.push({ type: "output_text", text: "" });
        content[contentIndex] = part;
        item.content = content;
    }
    #appendText(index, contentIndex, delta) {
        const item = this.#ensureItem(index);
        if (item.type !== "message") {
            item.type = "message";
            item.role = item.role ?? "assistant";
        }
        const content = Array.isArray(item.content) ? [...item.content] : [];
        while (content.length <= contentIndex)
            content.push({ type: "output_text", text: "" });
        const part = content[contentIndex];
        if (isRecord(part) && part.type === "output_text") {
            content[contentIndex] = {
                ...part,
                text: `${typeof part.text === "string" ? part.text : ""}${delta}`,
            };
        }
        else {
            content[contentIndex] = { type: "output_text", text: delta };
        }
        item.content = content;
    }
    #setText(index, contentIndex, text) {
        const item = this.#ensureItem(index);
        const content = Array.isArray(item.content) ? [...item.content] : [];
        while (content.length <= contentIndex)
            content.push({ type: "output_text", text: "" });
        content[contentIndex] = { type: "output_text", text };
        item.content = content;
    }
    #ensureReasoningItem(index) {
        while (this.output.length <= index) {
            this.output.push({ type: "reasoning", summary: [] });
        }
        const item = this.output[index];
        if (!isRecord(item)) {
            const next = { type: "reasoning", summary: [] };
            this.output[index] = next;
            return next;
        }
        const rec = item;
        if (rec.type !== "reasoning")
            rec.type = "reasoning";
        return rec;
    }
    #appendReasoningText(index, contentIndex, delta) {
        const item = this.#ensureReasoningItem(index);
        const content = Array.isArray(item.content) ? [...item.content] : [];
        while (content.length <= contentIndex)
            content.push({ type: "reasoning_text", text: "" });
        const part = content[contentIndex];
        if (isRecord(part) && part.type === "reasoning_text") {
            content[contentIndex] = {
                ...part,
                text: `${typeof part.text === "string" ? part.text : ""}${delta}`,
            };
        }
        else {
            content[contentIndex] = { type: "reasoning_text", text: delta };
        }
        item.content = content;
    }
    #setReasoningText(index, contentIndex, text) {
        const item = this.#ensureReasoningItem(index);
        const content = Array.isArray(item.content) ? [...item.content] : [];
        while (content.length <= contentIndex)
            content.push({ type: "reasoning_text", text: "" });
        content[contentIndex] = { type: "reasoning_text", text };
        item.content = content;
    }
    #appendReasoningSummary(index, summaryIndex, delta) {
        const item = this.#ensureReasoningItem(index);
        const summary = Array.isArray(item.summary) ? [...item.summary] : [];
        while (summary.length <= summaryIndex)
            summary.push({ type: "summary_text", text: "" });
        const part = summary[summaryIndex];
        if (isRecord(part) && part.type === "summary_text") {
            summary[summaryIndex] = {
                ...part,
                text: `${typeof part.text === "string" ? part.text : ""}${delta}`,
            };
        }
        else {
            summary[summaryIndex] = { type: "summary_text", text: delta };
        }
        item.summary = summary;
    }
    #setReasoningSummary(index, summaryIndex, text) {
        const item = this.#ensureReasoningItem(index);
        const summary = Array.isArray(item.summary) ? [...item.summary] : [];
        while (summary.length <= summaryIndex)
            summary.push({ type: "summary_text", text: "" });
        summary[summaryIndex] = { type: "summary_text", text };
        item.summary = summary;
    }
    #appendArgs(index, delta) {
        const item = this.#ensureItem(index);
        item.type = "function_call";
        item.arguments = `${typeof item.arguments === "string" ? item.arguments : ""}${delta}`;
    }
    #setArgs(index, args) {
        const item = this.#ensureItem(index);
        item.type = "function_call";
        item.arguments = args;
    }
}
//# sourceMappingURL=stream.js.map