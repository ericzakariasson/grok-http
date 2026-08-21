import {
  DEFAULT_BASE_URL,
  DEFAULT_IDLE_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
} from "./constants.js";
import { assertNodeVersion, isNode, readEnvApiKey } from "./env.js";
import { ModelsResource } from "./resources/models.js";
import { Responses } from "./resources/responses.js";
import type { ClientOptions, RequestHook, ResponseHook } from "./types.js";

export class Xai {
  readonly apiKey: string;
  readonly baseURL: string;
  readonly timeout: number;
  readonly idleTimeout: number;
  /** Retry count (jitter + Retry-After). Default 2. Streams retry only before the first SSE byte. */
  readonly maxRetries: number;
  readonly defaultHeaders: Record<string, string>;
  readonly fetch: typeof fetch;
  readonly onRequest?: RequestHook;
  readonly onResponse?: ResponseHook;
  readonly responses: Responses;
  readonly models: ModelsResource;

  constructor(opts: ClientOptions = {}) {
    assertNodeVersion();
    const apiKey = opts.apiKey ?? readEnvApiKey();
    if (!apiKey) {
      throw new Error(
        isNode()
          ? "Xai: apiKey is missing (set XAI_API_KEY or pass apiKey)"
          : "Xai: pass apiKey explicitly in browsers and Workers",
      );
    }
    this.apiKey = apiKey;
    this.baseURL = (opts.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = opts.timeout ?? DEFAULT_TIMEOUT_MS;
    this.idleTimeout = opts.idleTimeout ?? DEFAULT_IDLE_TIMEOUT_MS;
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.defaultHeaders = { ...opts.defaultHeaders };
    this.fetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.onRequest = opts.onRequest;
    this.onResponse = opts.onResponse;
    this.responses = new Responses(this);
    this.models = new ModelsResource(this);
  }
}
