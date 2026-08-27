# Chat demo

Streaming chat UI for `@xai/sdk`. Not an official xAI app.

```bash
npm install && npm run build   # from the repo root
cd examples/chat
cp .env.example .env.local     # XAI_API_KEY=...
npm install && npm run dev
```

Open http://localhost:3000. The key stays on the server. Each conversation sends the same `prompt_cache_key` every turn.

`npm test` mocks the stream mapping; it does not call the API.
