# Chat demo

Chat demo for `@xai/sdk` using shadcn chat components. Not an official xAI app.

Streams `responses.create({ stream: true })` from this repo’s client. Does not use Vercel AI SDK `useChat`.

## Run

Node 22+. From the repo root, build the library if `dist/` is missing:

```bash
npm install
npm run build
```

Then:

```bash
cd examples/chat
cp .env.example .env.local
# put a key in .env.local
# XAI_API_KEY=...
npm install
npm run dev
```

Open http://localhost:3000.

`@xai/sdk` is installed as `file:../..`. The API key stays on the server (`POST /api/chat`). It is never sent to the browser.

## Verify

With `XAI_API_KEY` set, send a message. The assistant bubble should fill as `response.output_text.delta` events arrive. Stop cancels the in-flight request via `AbortController`. The next turn sends `input: [...prior.toInput(), { role: "user", content }]`.

Without a key the page still boots; `/api/chat` returns an error.

```bash
npm test
```

That test mocks the stream mapping. It does not call api.x.ai.

## Notes

- Model: `grok-4.6` (`models.Grok46`). `store` stays at the SDK default (`false`).
- Default theme is light. The header toggle persists `light` / `dark` in `localStorage` (`grok-chat-theme`) and falls back to the system preference when unset.
- shadcn components are the June 2026 radix set (`message-scroller`, `message`, `bubble`, `marker`, `attachment`). Usual install is `npx shadcn@latest add message-scroller message bubble marker`. This demo vendors those files plus nova styles so the app does not depend on ui.shadcn.com at runtime.
