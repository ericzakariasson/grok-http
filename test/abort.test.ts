import { describe, expect, it } from "vitest";
import { AbortError, APIError, Xai } from "../src/index.js";
import { createBody, mockFetch, sseResponse } from "./helpers.js";

describe("abort", () => {
  it("throws AbortError when the signal aborts mid-stream", async () => {
    const ac = new AbortController();
    const { fetch } = mockFetch(() =>
      sseResponse(
        [{ type: "response.created", response: { id: "resp_s", status: "in_progress", output: [] } }],
        { hang: true },
      ),
    );
    const client = new Xai({ apiKey: "test-key", fetch, maxRetries: 0 });
    const stream = await client.responses.create({ ...createBody, stream: true }, { signal: ac.signal });
    const iter = stream[Symbol.asyncIterator]();
    const first = await iter.next();
    expect(first.value).toMatchObject({ type: "response.created" });
    ac.abort();
    await expect(iter.next()).rejects.toSatisfy(
      (err: unknown) => APIError.is(err) && err.isAbort() && err instanceof AbortError,
    );
  });

  it("closes the socket on asyncDispose", async () => {
    let cancelled = false;
    const encoder = new TextEncoder();
    const { fetch } = mockFetch(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "ping" })}\n\n`,
                ),
              );
            },
            cancel() {
              cancelled = true;
            },
          }),
          { status: 200, headers: { "content-type": "text/event-stream", "x-request-id": "req_test" } },
        ),
    );
    const client = new Xai({ apiKey: "test-key", fetch, maxRetries: 0 });
    const stream = await client.responses.create({ ...createBody, stream: true });
    await stream[Symbol.asyncDispose]();
    expect(cancelled).toBe(true);
  });
});
