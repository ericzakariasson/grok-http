import { describe, expect, it } from "vitest";
import {
  AbortError,
  APIError,
  AuthenticationError,
  NotFoundError,
  OverloadedError,
  PermissionDeniedError,
  RateLimitError,
  TimeoutError,
  Xai,
} from "../src/index.js";
import { errorFromUnknown } from "../src/errors.js";
import { createBody, jsonResponse, mockFetch } from "./helpers.js";

describe("typed errors", () => {
  function client(status: number, body: unknown): Xai {
    const { fetch } = mockFetch(() => jsonResponse(body, { status }));
    return new Xai({ apiKey: "k", fetch, maxRetries: 0 });
  }

  it("maps status codes to classes and APIError.is", async () => {
    const cases: Array<[number, unknown]> = [
      [401, AuthenticationError],
      [403, PermissionDeniedError],
      [404, NotFoundError],
      [429, RateLimitError],
      [529, OverloadedError],
    ];
    for (const [status, Ctor] of cases) {
      const err = await client(status, { error: { message: "nope" } })
        .responses.create(createBody)
        .catch((e: unknown) => e);
      expect(APIError.is(err)).toBe(true);
      expect(err).toBeInstanceOf(Ctor);
      expect((err as APIError).request_id).toBe("req_test");
    }
  });

  it("exposes isRateLimit / isOverloaded", async () => {
    const rate = await client(429, { error: { message: "slow" } })
      .responses.create(createBody)
      .catch((e: unknown) => e as APIError);
    expect(rate.isRateLimit()).toBe(true);
    const over = await client(529, { error: { message: "busy" } })
      .responses.create(createBody)
      .catch((e: unknown) => e as APIError);
    expect(over.isOverloaded()).toBe(true);
  });

  it("rewrites 400 dropped-reasoning messages", async () => {
    const err = await client(400, {
      error: { message: "missing encrypted reasoning content" },
    })
      .responses.create(createBody)
      .catch((e: unknown) => e as APIError);
    expect(err.message).toBe("pass response.toInput() (or include encrypted reasoning)");
  });

  it("does not rewrite 400s that merely mention reason or reasoning_effort", async () => {
    const message = "invalid reasoning_effort: must be low, medium, or high";
    const err = await client(400, { error: { message } })
      .responses.create(createBody)
      .catch((e: unknown) => e as APIError);
    expect(err.message).toBe(message);
  });

  it("maps TimeoutError-named failures to TimeoutError, not AbortError", () => {
    const err = errorFromUnknown(new DOMException("The operation timed out", "TimeoutError"), "req_1");
    expect(err).toBeInstanceOf(TimeoutError);
    expect(err).not.toBeInstanceOf(AbortError);
    expect(err.message).toBe("The operation timed out");
  });

  it("times out idle JSON reads as TimeoutError", async () => {
    const { fetch } = mockFetch(
      () =>
        new Response(
          new ReadableStream({
            async start() {
              await new Promise(() => {});
            },
          }),
          { status: 200, headers: { "content-type": "application/json", "x-request-id": "req_test" } },
        ),
    );
    const c = new Xai({ apiKey: "k", fetch, maxRetries: 0, idleTimeout: 20, timeout: 5_000 });
    await expect(c.responses.create(createBody)).rejects.toBeInstanceOf(TimeoutError);
  });

  it("package engines reject Node 20", async () => {
    const { readFileSync } = await import("node:fs");
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      engines: { node: string };
      private: boolean;
      publishConfig?: unknown;
    };
    expect(pkg.engines.node).toBe(">=22");
    expect(pkg.private).toBe(true);
    expect(pkg.publishConfig).toBeUndefined();
  });
});
