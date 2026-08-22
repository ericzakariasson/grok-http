# grok-http

Thin TypeScript client for the Grok HTTP Responses API (`https://api.x.ai/v1`). Typed fetch wrapper: create/get/delete responses, list models, stream, abort, usage, next-turn `toInput()`.

Not an official xAI package. Not published to npm.

Install from git (package name `@xai/sdk`):

```bash
npm install github:ericzakariasson/grok-http
# or
npm install git+https://github.com/ericzakariasson/grok-http.git
```

Requires Node.js 22+. Uses `fetch` only (Node, browsers, Workers). Pass `apiKey` explicitly outside Node.

## Switch from openai-node

```ts
import { Xai, models } from "@xai/sdk";

const client = new Xai({
  apiKey: process.env.XAI_API_KEY!,
  baseURL: "https://api.x.ai/v1",
});

const res = await client.responses.create({
  model: models.Grok46, // "grok-4.6"
  input: "What is 101*3?",
});

console.log(res.toText());
console.log(res.usage.cost_usd);
console.log(res.http.requestId);
```

`store` defaults to **false** here (wire default is true, 30 days). When `store` is false, the client sends `include: ['reasoning.encrypted_content']` unless you set `include` yourself. Next turn: `input: [...res.toInput(), { role: "user", content: "..." }]` or `previous_response_id` with `store: true`.

## Stream

```ts
await using stream = await client.responses.create({
  model: "grok-4.6",
  input: [{ role: "user", content: "Hello" }],
  stream: true,
});

for await (const event of stream) {
  if (event.type === "response.output_text.delta") process.stdout.write(event.delta);
}

stream.status;
stream.output;
stream.usage;
stream.toText();
```

Event names (OpenAI Responses-style; frozen): `ping`, `error`, `response.created`, `response.in_progress`, `response.completed`, `response.failed`, `response.incomplete`, `response.output_item.added`, `response.output_item.done`, `response.content_part.added`, `response.content_part.done`, `response.output_text.delta`, `response.output_text.done`, `response.reasoning_text.delta`, `response.reasoning_text.done`, `response.reasoning_summary_text.delta`, `response.reasoning_summary_text.done`, `response.function_call_arguments.delta`, `response.function_call_arguments.done`. Unknown wire events are `{ type: "unknown", raw }`. Function-call argument deltas are fragments; parse JSON at `output_item.done`. Model/server errors arrive as `error` / `response.failed` events. DNS and abort throw. `AbortSignal` is accepted on every method; abort still bills. `Symbol.asyncDispose` closes the socket.

## Other methods

- `responses.get(id)` / `responses.delete(id)` — stored responses (`store: true`)
- `responses.inputItems.list(id)` — prefer `toInput()` on the object you already have
- `models.list()` / `models.get(id)`

`XAI_DEBUG=1` prints a copy-paste curl with the key redacted. Every result has `res.http` (`status`, `headers`, `requestId`). Pass `{ http: { body: true } }` for the raw JSON body.

## Examples

- [`examples/chat`](examples/chat) — Next.js streaming chat UI using this package and shadcn chat components. Not an official xAI app.

Wire types are generated from `openapi/http.yaml` (Responses + Models only).

```bash
npm install
npm run generate   # openapi/http.yaml → src/generated/types.ts
npm test
npm run build
```

