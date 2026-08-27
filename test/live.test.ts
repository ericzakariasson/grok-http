import { describe, expect, it } from "vitest";
import { APIError, models, Xai } from "../src/index.js";

const hasKey = Boolean(process.env.XAI_API_KEY);

function liveClient(): Xai {
  return new Xai({ maxRetries: 0 });
}

describe.skipIf(!hasKey)("live API (CI)", { timeout: 180_000 }, () => {
  it("text: create grok-4.6, toText() and usage", async () => {
    const res = await liveClient().responses.create({
      model: models.Grok46,
      instructions: "Be brief.",
      input: "What is xAI?",
    });
    expect(res.toText().trim().length).toBeGreaterThan(0);
    expect(res.usage.total_tokens).toBeGreaterThan(0);
    expect(res.usage.input_tokens).toBeGreaterThan(0);
    expect(res.usage.output_tokens).toBeGreaterThan(0);
  });

  it("stream + abort after ~2s (abort still bills)", async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 2_000);
    try {
      await using stream = await liveClient().responses.create(
        { model: models.Grok46, input: "Count to 100.", stream: true },
        { signal: ac.signal },
      );
      for await (const ev of stream) {
        void ev;
      }
      // Finished before the timer. Client is fine; abort still bills when it wins the race.
    } catch (err) {
      if (!(APIError.is(err) && err.isAbort())) throw err;
    } finally {
      clearTimeout(timer);
    }
  });

  it("multi-turn via toInput()", async () => {
    const client = liveClient();
    const a = await client.responses.create({
      model: models.Grok46,
      input: "How big is the universe?",
    });
    expect(a.toText().trim().length).toBeGreaterThan(0);
    expect(a.toInput().length).toBeGreaterThan(0);

    const b = await client.responses.create({
      model: models.Grok46,
      input: [...a.toInput(), { role: "user", content: "And how do stars form?" }],
    });
    expect(b.toText().trim().length).toBeGreaterThan(0);
    expect(b.usage.total_tokens).toBeGreaterThan(0);
  });
});
