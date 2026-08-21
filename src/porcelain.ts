import { ENCRYPTED_REASONING, SDK_STORE_DEFAULT } from "./constants.js";
import type { CreateParams, InputItem, OutputItem } from "./types.js";
import type { FunctionCallItem, OutputMessage, ReasoningItem } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isMessage(item: unknown): item is OutputMessage {
  return isRecord(item) && item.type === "message";
}

export function isReasoning(item: unknown): item is ReasoningItem {
  return isRecord(item) && item.type === "reasoning";
}

export function isFunctionCall(item: unknown): item is FunctionCallItem {
  return isRecord(item) && item.type === "function_call";
}

export function toText(output: readonly OutputItem[]): string {
  let text = "";
  for (const item of output) {
    if (!isMessage(item) || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (isRecord(part) && part.type === "output_text" && typeof part.text === "string") {
        text += part.text;
      }
    }
  }
  return text;
}

/** Echoes all output items, including reasoning, for the next turn. */
export function toInput(output: readonly OutputItem[]): InputItem[] {
  return output.map((item) => structuredClone(item) as InputItem);
}

export function parseJsonOutput(
  output: readonly OutputItem[],
  status: string,
  throwOnFail: boolean,
): unknown {
  const text = toText(output);
  if (status !== "completed") {
    if (throwOnFail) {
      throw new Error("Response is truncated; toJson() requires a completed result");
    }
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (err) {
    if (throwOnFail) throw err;
    return null;
  }
}

function isBlobLike(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);
  const mime = blob.type || "application/octet-stream";
  return `data:${mime};base64,${b64}`;
}

async function inlineValue(value: unknown): Promise<unknown> {
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) out.push(await inlineValue(item));
    return out;
  }
  if (!isRecord(value)) return value;
  if (value.type === "input_image" && isBlobLike(value.image)) {
    const image_url = await blobToDataUrl(value.image);
    const next: Record<string, unknown> = { type: "input_image", image_url };
    if (value.detail !== undefined) next.detail = value.detail;
    return next;
  }
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    next[k] = await inlineValue(v);
  }
  return next;
}

/**
 * Convert porcelain `image: Blob | File` parts to wire `image_url` data URLs.
 */
export async function inlineBlobs(input: string | InputItem[]): Promise<string | InputItem[]> {
  if (typeof input === "string") return input;
  return (await inlineValue(input)) as InputItem[];
}

/**
 * Apply SDK defaults. `store` wire default is true (30 days); SDK default is false.
 * When `store` is false and `include` is unset, send `['reasoning.encrypted_content']`.
 */
export function applyCreateDefaults(body: CreateParams): Record<string, unknown> {
  const store = body.store ?? SDK_STORE_DEFAULT;
  const out: Record<string, unknown> = { ...body, store };
  if (body.include === undefined && store === false) {
    out.include = [ENCRYPTED_REASONING];
  }
  if (body.stream === undefined) {
    out.stream = false;
  }
  return out;
}
