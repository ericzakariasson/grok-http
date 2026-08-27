import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Xai } from "../src/index.js";
import { SDK_LANG, SDK_USER_AGENT, SDK_VERSION } from "../src/version.js";
import { completedResponse, createBody, jsonResponse, mockFetch } from "./helpers.js";

function client(fetch: typeof globalThis.fetch, defaultHeaders?: Record<string, string>): Xai {
  return new Xai({ apiKey: "test-key", fetch, maxRetries: 0, defaultHeaders });
}

describe("attribution headers", () => {
  it("SDK_VERSION matches package.json", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      version: string;
    };
    expect(SDK_VERSION).toBe(pkg.version);
    expect(SDK_USER_AGENT).toBe(`@xai/sdk/${pkg.version}`);
  });

  it("sends User-Agent, xai-sdk-version, and xai-sdk-lang on every request", async () => {
    const { fetch, captured } = mockFetch(() => jsonResponse(completedResponse));
    await client(fetch).responses.create(createBody);

    const headers = captured.requests[0]?.headers;
    expect(headers?.get("user-agent")).toBe(SDK_USER_AGENT);
    expect(headers?.get("xai-sdk-version")).toBe(SDK_VERSION);
    expect(headers?.get("xai-sdk-lang")).toBe(SDK_LANG);
  });

  it("does not overwrite a caller-supplied User-Agent", async () => {
    const { fetch, captured } = mockFetch(() => jsonResponse(completedResponse));
    await client(fetch).responses.create(createBody, { headers: { "User-Agent": "my-app/9.9" } });

    const headers = captured.requests[0]?.headers;
    expect(headers?.get("user-agent")).toBe("my-app/9.9");
    expect(headers?.get("xai-sdk-version")).toBe(SDK_VERSION);
    expect(headers?.get("xai-sdk-lang")).toBe(SDK_LANG);
  });

  it("does not overwrite User-Agent from defaultHeaders", async () => {
    const { fetch, captured } = mockFetch(() => jsonResponse(completedResponse));
    await client(fetch, { "User-Agent": "wrapper/2" }).models.list();

    const headers = captured.requests[0]?.headers;
    expect(headers?.get("user-agent")).toBe("wrapper/2");
    expect(headers?.get("xai-sdk-version")).toBe(SDK_VERSION);
    expect(headers?.get("xai-sdk-lang")).toBe(SDK_LANG);
  });
});
