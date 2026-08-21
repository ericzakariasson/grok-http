import { describe, expect, it } from "vitest";
import { Xai } from "../src/index.js";
import { completedResponse, createBody, erroringSse, jsonResponse, mockFetch, sseResponse } from "./helpers.js";

describe("retries", () => {
  it("retries HTTP 429 before any SSE bytes, honoring Retry-After", async () => {
    const { fetch, captured } = mockFetch((_req, n) => {
      if (n === 1) {
        return jsonResponse(
          { error: { message: "rate limited" } },
          { status: 429, headers: { "retry-after": "0" } },
        );
      }
      return sseResponse([{ type: "response.completed", response: completedResponse }]);
    });
    const client = new Xai({ apiKey: "test-key", fetch, maxRetries: 2 });
    const stream = await client.responses.create({ ...createBody, stream: true });
    const types: string[] = [];
    for await (const event of stream) types.push(event.type);
    expect(captured.requests).toHaveLength(2);
    expect(types).toContain("response.completed");
  });

  it("retries when the stream errors before the first SSE byte", async () => {
    const { fetch, captured } = mockFetch((_req, n) => {
      if (n === 1) return erroringSse(true);
      return sseResponse([{ type: "response.completed", response: completedResponse }]);
    });
    const client = new Xai({ apiKey: "test-key", fetch, maxRetries: 2 });
    const stream = await client.responses.create({ ...createBody, stream: true });
    for await (const _ of stream) {
      // drain
    }
    expect(captured.requests.length).toBeGreaterThanOrEqual(2);
    expect(stream.status).toBe("completed");
  });

  it("does not retry after the first SSE byte", async () => {
    const { fetch, captured } = mockFetch(() => erroringSse(false));
    const client = new Xai({ apiKey: "test-key", fetch, maxRetries: 2 });
    const stream = await client.responses.create({ ...createBody, stream: true });
    await expect(async () => {
      for await (const _ of stream) {
        // drain
      }
    }).rejects.toThrow();
    expect(captured.requests).toHaveLength(1);
  });

  it("retries JSON 529 then succeeds", async () => {
    const { fetch, captured } = mockFetch((_req, n) => {
      if (n <= 2) {
        return jsonResponse({ error: { message: "overloaded" } }, { status: 529, headers: { "retry-after": "0" } });
      }
      return jsonResponse(completedResponse);
    });
    const client = new Xai({ apiKey: "test-key", fetch, maxRetries: 2 });
    const res = await client.responses.create(createBody);
    expect(res.id).toBe("resp_123");
    expect(captured.requests).toHaveLength(3);
  });
});
