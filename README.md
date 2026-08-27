# grok-http

Thin TypeScript client for the Grok Responses HTTP API. Not official. Not on npm.

```bash
npm install github:ericzakariasson/grok-http
```

```ts
import { Xai, models } from "@xai/sdk";

const client = new Xai({ apiKey: process.env.XAI_API_KEY! });

const res = await client.responses.create({
  model: models.Grok46,
  input: "What is 101*3?",
});

console.log(res.toText());
console.log(res.usage.cost_usd);
```

Next turn, pass the same `prompt_cache_key` every turn of that conversation (cache hits live on one server) plus `toInput()`:

```ts
const next = await client.responses.create({
  model: "grok-4.6",
  prompt_cache_key: conversationId, // same id every turn
  input: [...res.toInput(), { role: "user", content: "And galaxies?" }],
});
```

```ts
await using stream = await client.responses.create({
  model: "grok-4.6",
  input: "Hello",
  stream: true,
});

for await (const event of stream) {
  if (event.type === "response.output_text.delta") process.stdout.write(event.delta);
}
```

Chat UI: [`examples/chat`](examples/chat). Node 22+. `npm test` / `npm run test:live`.
