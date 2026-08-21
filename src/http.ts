import {
  DEFAULT_IDLE_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
  RETRYABLE_STATUS,
} from "./constants.js";
import { debugEnabled } from "./env.js";
import {
  APIConnectionError,
  APIError,
  AbortError,
  TimeoutError,
  errorFromAbort,
  errorFromResponse,
  errorFromUnknown,
  requestIdFromHeaders,
} from "./errors.js";
import type { HttpMeta, RequestOpts } from "./types.js";
import type { Xai } from "./client.js";

export function joinURL(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export function formatCurl(method: string, url: string, headers: Headers, body?: string): string {
  const lines = [`curl -sS -X ${method} '${escapeSingle(url)}'`];
  headers.forEach((value, key) => {
    let v = value;
    if (key.toLowerCase() === "authorization") v = "Bearer [REDACTED]";
    lines.push(`  -H '${escapeSingle(`${key}: ${v}`)}'`);
  });
  if (body !== undefined) {
    lines.push(`  -d '${escapeSingle(body)}'`);
  }
  return lines.join(" \\\n");
}

function escapeSingle(value: string): string {
  return value.replace(/'/g, `'\\''`);
}

export function combineSignals(signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
  const list = signals.filter((s): s is AbortSignal => Boolean(s));
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];
  if (typeof AbortSignal.any === "function") return AbortSignal.any(list);
  const controller = new AbortController();
  const onAbort = () => {
    const first = list.find((s) => s.aborted);
    controller.abort(first?.reason);
  };
  for (const s of list) {
    if (s.aborted) {
      onAbort();
      return controller.signal;
    }
    s.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

export function retryDelayMs(attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = Number.parseFloat(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 60_000);
    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) return Math.min(Math.max(date - Date.now(), 0), 60_000);
  }
  const base = 250 * 2 ** attempt;
  const capped = Math.min(base, 8_000);
  return capped * (0.5 + Math.random() * 0.5);
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(errorFromAbort(signal, null));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal ? errorFromAbort(signal, null) : new AbortError("Request aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function buildHeaders(client: Xai, opts: RequestOpts | undefined, stream: boolean, hasBody: boolean): Headers {
  const headers = new Headers(client.defaultHeaders);
  if (opts?.headers) {
    new Headers(opts.headers).forEach((v, k) => headers.set(k, v));
  }
  if (!headers.has("authorization")) headers.set("authorization", `Bearer ${client.apiKey}`);
  if (hasBody && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (!headers.has("accept")) headers.set("accept", stream ? "text/event-stream" : "application/json");
  return headers;
}

export type InternalRequest = {
  method: string;
  path: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  stream?: boolean;
  opts?: RequestOpts;
};

function withQuery(url: string, query?: Record<string, string | number | undefined>): string {
  if (!query) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

function timeoutSignal(ms: number | undefined): { signal?: AbortSignal; cleanup: () => void } {
  if (ms === undefined || ms <= 0) return { cleanup: () => {} };
  if (typeof AbortSignal.timeout === "function") {
    return { signal: AbortSignal.timeout(ms), cleanup: () => {} };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new TimeoutError("Request timed out")), ms);
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
}

export type SendResult = {
  response: Response;
  http: HttpMeta;
  payload: unknown;
  body: ReadableStream<Uint8Array> | null;
  sawByte: boolean;
};

export async function send(client: Xai, req: InternalRequest): Promise<SendResult> {
  const timeout = req.opts?.timeout ?? client.timeout;
  const maxRetries = req.opts?.maxRetries ?? client.maxRetries;
  const idleTimeout = req.opts?.idleTimeout ?? client.idleTimeout;
  const hasBody = req.body !== undefined && req.method !== "GET" && req.method !== "HEAD";
  const jsonBody = hasBody ? JSON.stringify(req.body) : undefined;
  const url = withQuery(joinURL(client.baseURL, req.path), req.query);
  const stream = Boolean(req.stream);

  let attempt = 0;
  let lastRequestId: string | null = null;

  while (true) {
    const headers = buildHeaders(client, req.opts, stream, hasBody);
    const t = timeoutSignal(timeout);
    const signal = combineSignals([req.opts?.signal, t.signal]);
    if (signal?.aborted) {
      t.cleanup();
      throw errorFromAbort(signal, lastRequestId);
    }

    const request = new Request(url, { method: req.method, headers, body: jsonBody, signal });
    if (debugEnabled()) {
      console.error(formatCurl(req.method, url, headers, jsonBody));
    }

    try {
      if (client.onRequest) await client.onRequest(request.clone());
      const response = await client.fetch(request);
      lastRequestId = requestIdFromHeaders(response.headers);
      if (client.onResponse) await client.onResponse(response.clone());

      if (!response.ok) {
        const err = await errorFromResponse(response);
        t.cleanup();
        if (RETRYABLE_STATUS.has(response.status) && attempt < maxRetries) {
          attempt += 1;
          await sleep(retryDelayMs(attempt - 1, response.headers.get("retry-after")), signal);
          continue;
        }
        throw err;
      }

      const http: HttpMeta = {
        status: response.status,
        headers: response.headers,
        requestId: lastRequestId,
      };

      if (stream) {
        const peeked = await peekFirstChunk(response, idleTimeout, signal, lastRequestId);
        t.cleanup();
        if (!peeked.sawByte && peeked.error && attempt < maxRetries && shouldRetryStreamOpen(peeked.error)) {
          attempt += 1;
          await sleep(retryDelayMs(attempt - 1, null), signal);
          continue;
        }
        if (peeked.error && !peeked.sawByte) throw peeked.error;
        return { response, http, payload: undefined, body: peeked.stream, sawByte: peeked.sawByte };
      }

      const text = await readBodyWithIdle(response, idleTimeout, signal, lastRequestId);
      t.cleanup();
      let payload: unknown = undefined;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = text;
        }
      }
      if (req.opts?.http?.body) http.body = payload;
      return { response, http, payload, body: null, sawByte: true };
    } catch (err) {
      t.cleanup();
      if (signal?.aborted) throw errorFromAbort(signal, lastRequestId);
      if (APIError.is(err) && !(err instanceof APIConnectionError) && !(err instanceof TimeoutError)) {
        throw err;
      }
      if (err instanceof TimeoutError) throw err;
      if (attempt < maxRetries) {
        attempt += 1;
        await sleep(retryDelayMs(attempt - 1, null), req.opts?.signal);
        continue;
      }
      throw errorFromUnknown(err, lastRequestId);
    }
  }
}

function shouldRetryStreamOpen(err: unknown): boolean {
  if (err instanceof AbortError || err instanceof TimeoutError) return false;
  if (APIError.is(err) && err.isAbort()) return false;
  return true;
}

type PeekResult = {
  sawByte: boolean;
  stream: ReadableStream<Uint8Array> | null;
  error?: APIError;
};

async function peekFirstChunk(
  response: Response,
  idleTimeout: number,
  signal: AbortSignal | undefined,
  requestId: string | null,
): Promise<PeekResult> {
  const body = response.body;
  if (!body) return { sawByte: false, stream: null };

  const reader = body.getReader();
  try {
    const first = await readOnce(reader, idleTimeout, signal, requestId);
    const chunks: Uint8Array[] = [];
    let ended = first.done;
    if (first.value && first.value.byteLength > 0) chunks.push(first.value);
    const sawByte = chunks.length > 0;
    const idleWrapped = makePullStream(reader, chunks, ended, idleTimeout, signal, requestId);
    return { sawByte, stream: idleWrapped };
  } catch (err) {
    try {
      await reader.cancel();
    } catch {
      // ignore
    }
    const mapped = errorFromUnknown(err, requestId);
    return { sawByte: false, stream: null, error: mapped };
  }
}

function makePullStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  prefix: Uint8Array[],
  ended: boolean,
  idleTimeout: number,
  signal: AbortSignal | undefined,
  requestId: string | null,
): ReadableStream<Uint8Array> {
  const pending = [...prefix];
  let done = ended;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (pending.length > 0) {
        controller.enqueue(pending.shift()!);
        return;
      }
      if (done) {
        controller.close();
        return;
      }
      try {
        const next = await readOnce(reader, idleTimeout, signal, requestId);
        if (next.done) {
          done = true;
          controller.close();
          return;
        }
        controller.enqueue(next.value);
      } catch (err) {
        controller.error(errorFromUnknown(err, requestId));
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });
}

async function readOnce(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  idleTimeout: number,
  signal: AbortSignal | undefined,
  requestId: string | null,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  return await new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(errorFromAbort(signal, requestId));
      return;
    }
    let idle: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => {
      if (idle !== undefined) clearTimeout(idle);
      reject(errorFromAbort(signal!, requestId));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    if (idleTimeout > 0) {
      idle = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        reject(new TimeoutError("Idle timeout", { request_id: requestId }));
      }, idleTimeout);
    }
    reader.read().then(
      (value) => {
        signal?.removeEventListener("abort", onAbort);
        if (idle !== undefined) clearTimeout(idle);
        resolve(value);
      },
      (err) => {
        signal?.removeEventListener("abort", onAbort);
        if (idle !== undefined) clearTimeout(idle);
        reject(err);
      },
    );
  });
}

async function readBodyWithIdle(
  response: Response,
  idleTimeout: number,
  signal: AbortSignal | undefined,
  requestId: string | null,
): Promise<string> {
  if (!response.body) return response.text();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let out = "";
  try {
    while (true) {
      const result = await readOnce(reader, idleTimeout, signal, requestId);
      if (result.done) break;
      out += decoder.decode(result.value, { stream: true });
    }
    out += decoder.decode();
    return out;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}

export { DEFAULT_IDLE_TIMEOUT_MS, DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT_MS };
