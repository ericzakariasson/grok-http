import { isKnownStreamEventType } from "./constants.js";
import {
  APIError,
  OverloadedError,
  TimeoutError,
  errorFromUnknown,
  streamErrorEvent,
} from "./errors.js";
import { parseSse } from "./sse.js";
import { parseJsonOutput, toInput, toText } from "./porcelain.js";
import { emptyUsage, mapUsage, type Usage } from "./usage.js";
import type {
  HttpMeta,
  IncompleteDetails,
  InputItem,
  OutputItem,
  ResponseStatus,
  XaiStreamEvent,
} from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class XaiStream implements AsyncIterable<XaiStreamEvent>, AsyncDisposable {
  id = "";
  status: ResponseStatus = "in_progress";
  output: OutputItem[] = [];
  incomplete_details: IncompleteDetails | null = null;
  usage: Usage = emptyUsage();
  http: HttpMeta;
  error: unknown = null;
  model?: string;

  #body: ReadableStream<Uint8Array> | null;
  #closed = false;
  #consumed = false;
  #requestId: string | null;
  #signal: AbortSignal | undefined;

  constructor(init: {
    body: ReadableStream<Uint8Array> | null;
    http: HttpMeta;
    signal?: AbortSignal;
  }) {
    this.http = init.http;
    this.#body = init.body;
    this.#requestId = init.http.requestId;
    this.#signal = init.signal;
  }

  get parsed(): unknown | null {
    return parseJsonOutput(this.output, this.status, false);
  }

  toText(): string {
    return toText(this.output);
  }

  toInput(): InputItem[] {
    return toInput(this.output);
  }

  toJson(): unknown {
    return parseJsonOutput(this.output, this.status, true);
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    const body = this.#body;
    this.#body = null;
    if (body) {
      try {
        await body.cancel();
      } catch {
        // already cancelled
      }
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<XaiStreamEvent> {
    if (this.#consumed) throw new Error("Stream already iterated");
    this.#consumed = true;
    if (!this.#body) return;
    try {
      for await (const raw of parseSse(this.#body)) {
        const event = this.#normalize(raw);
        this.#apply(event);
        yield event;
      }
      if (this.status === "completed") this.usage = mapUsage(this.usage);
    } catch (err) {
      const mapped = this.#signal?.aborted
        ? errorFromUnknown(this.#signal.reason ?? err, this.#requestId)
        : errorFromUnknown(err, this.#requestId);
      if (mapped instanceof TimeoutError) {
        const event: XaiStreamEvent = {
          type: "error",
          message: mapped.message,
          error: mapped,
        };
        this.error = mapped;
        this.status = "failed";
        yield event;
      }
      throw mapped;
    } finally {
      await this.close();
    }
  }

  #normalize(raw: unknown): XaiStreamEvent {
    if (!isRecord(raw)) return { type: "unknown", raw };
    const type = raw.type;
    if (type === "error") {
      const { event } = streamErrorEvent(raw, this.#requestId);
      this.error = (event as { error?: APIError }).error ?? this.error;
      return event as XaiStreamEvent;
    }
    if (typeof type === "string" && isKnownStreamEventType(type)) {
      return raw as XaiStreamEvent;
    }
    return { type: "unknown", raw };
  }

  #apply(event: XaiStreamEvent): void {
    switch (event.type) {
      case "response.created":
      case "response.in_progress":
      case "response.completed":
      case "response.failed":
      case "response.incomplete":
        this.#assignResponse((event as { response?: unknown }).response);
        break;
      case "response.output_item.added":
      case "response.output_item.done": {
        const e = event as { output_index: number; item: OutputItem };
        this.#setItem(e.output_index, e.item);
        break;
      }
      case "response.content_part.added":
      case "response.content_part.done": {
        const e = event as { output_index: number; content_index: number; part: unknown };
        this.#setPart(e.output_index, e.content_index, e.part);
        break;
      }
      case "response.output_text.delta": {
        const e = event as { output_index?: number; content_index?: number; delta: string };
        this.#appendText(e.output_index ?? 0, e.content_index ?? 0, e.delta);
        break;
      }
      case "response.output_text.done": {
        const e = event as { output_index?: number; content_index?: number; text: string };
        this.#setText(e.output_index ?? 0, e.content_index ?? 0, e.text);
        break;
      }
      case "response.function_call_arguments.delta": {
        const e = event as { output_index?: number; delta: string };
        this.#appendArgs(e.output_index ?? 0, e.delta);
        break;
      }
      case "response.function_call_arguments.done": {
        const e = event as { output_index?: number; arguments: string };
        this.#setArgs(e.output_index ?? 0, e.arguments);
        break;
      }
      case "error": {
        const err = (event as { error?: APIError }).error;
        if (err instanceof OverloadedError || err instanceof TimeoutError) this.status = "failed";
        break;
      }
      default:
        break;
    }
  }

  #assignResponse(response: unknown): void {
    if (!isRecord(response)) return;
    if (typeof response.id === "string") this.id = response.id;
    if (typeof response.status === "string") this.status = response.status as ResponseStatus;
    if (typeof response.model === "string") this.model = response.model;
    if (Array.isArray(response.output)) this.output = response.output as OutputItem[];
    if ("incomplete_details" in response) {
      this.incomplete_details = (response.incomplete_details as IncompleteDetails | null) ?? null;
    }
    if (response.error !== undefined) this.error = response.error;
    if (response.usage !== undefined || response.status === "completed") {
      this.usage = mapUsage(response.usage);
    }
  }

  #ensureItem(index: number): Record<string, unknown> {
    while (this.output.length <= index) {
      this.output.push({ type: "message", role: "assistant", content: [] } as OutputItem);
    }
    const item = this.output[index];
    if (!isRecord(item)) {
      const next = { type: "message", role: "assistant", content: [] };
      this.output[index] = next as OutputItem;
      return next;
    }
    return item;
  }

  #setItem(index: number, item: OutputItem): void {
    while (this.output.length < index) {
      this.output.push({ type: "message", role: "assistant", content: [] } as OutputItem);
    }
    this.output[index] = item;
  }

  #setPart(index: number, contentIndex: number, part: unknown): void {
    const item = this.#ensureItem(index);
    const content = Array.isArray(item.content) ? [...item.content] : [];
    while (content.length < contentIndex) content.push({ type: "output_text", text: "" });
    content[contentIndex] = part;
    item.content = content;
  }

  #appendText(index: number, contentIndex: number, delta: string): void {
    const item = this.#ensureItem(index);
    if (item.type !== "message") {
      item.type = "message";
      item.role = item.role ?? "assistant";
    }
    const content = Array.isArray(item.content) ? [...item.content] : [];
    while (content.length <= contentIndex) content.push({ type: "output_text", text: "" });
    const part = content[contentIndex];
    if (isRecord(part) && part.type === "output_text") {
      content[contentIndex] = {
        ...part,
        text: `${typeof part.text === "string" ? part.text : ""}${delta}`,
      };
    } else {
      content[contentIndex] = { type: "output_text", text: delta };
    }
    item.content = content;
  }

  #setText(index: number, contentIndex: number, text: string): void {
    const item = this.#ensureItem(index);
    const content = Array.isArray(item.content) ? [...item.content] : [];
    while (content.length <= contentIndex) content.push({ type: "output_text", text: "" });
    content[contentIndex] = { type: "output_text", text };
    item.content = content;
  }

  #appendArgs(index: number, delta: string): void {
    const item = this.#ensureItem(index);
    item.type = "function_call";
    item.arguments = `${typeof item.arguments === "string" ? item.arguments : ""}${delta}`;
  }

  #setArgs(index: number, args: string): void {
    const item = this.#ensureItem(index);
    item.type = "function_call";
    item.arguments = args;
  }
}
