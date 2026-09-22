# Integrating the Codzure agent module

**Merging this folder touches nothing outside `/agent`.**  
All code, deps, scripts, and env vars live here. The host app only needs a single wiring line (or a few) that you add yourself — this document does not modify host files.

## What you get

| Export | Purpose |
|--------|---------|
| `registerAgent(mount, deps)` | Mounts `GET /agent/health`, `GET /agent/tools`, `POST /agent/message` |
| `handleAgentMessage(input, deps)` | Programmatic path (no HTTP) |
| `createStubAdapters()` | In-memory Neo sales + Nyumba listings (default for local/dev) |
| `createRealAdapters()` | Empty TODO template for production ports |
| `contract.ts` types | Dependency-free shapes + port interfaces |

Env vars used by this module are prefixed `AGENT_` (e.g. `AGENT_ANTHROPIC_API_KEY`).  
In-memory persistence keys / ids use the `agent_` prefix.

## Single-line style wiring (Express / Fastify-like)

```ts
import {
  registerAgent,
  createStubAdapters, // swap → createRealAdapters when ready
} from "./agent/index.js"; // or "@codzure/agent" if you package it

const stubs = createStubAdapters();

registerAgent((path, method, handler) => {
  app[method.toLowerCase()](path, async (req, res) => {
    const out = await handler({
      body: req.body,
      query: req.query,
      headers: req.headers,
    });
    res.status(out.status).json(out.body);
  });
}, {
  ...stubs,
  anthropicApiKey: process.env.AGENT_ANTHROPIC_API_KEY!,
});
```

## Programmatic (no mount)

```ts
import { handleAgentMessage, createStubAdapters } from "./agent/index.js";

const deps = {
  ...createStubAdapters(),
  anthropicApiKey: process.env.AGENT_ANTHROPIC_API_KEY!,
};

const out = await handleAgentMessage(
  {
    message: "sold 3 bags cement to Mary 1500",
    product: "neo",
    userId: "u1",
    sessionId: "s1",
  },
  deps,
);
```

## Swap StubAdapters → RealAdapters

1. Open `agent/adapters/real.ts` and implement the `// TODO` bodies against Neo / Nyumba services.
2. Change the import in your host wiring:

```ts
import { createRealAdapters } from "./agent/adapters/real.js";
// ...
const ports = createRealAdapters();
```

3. Keep `contract.ts` port signatures unchanged so tools and the loop stay untouched.

## Guardrails (do not weaken)

- Write tools (`record_sale`) return `{ requiresConfirmation: true, summary, draftId }` and **do not** persist.
- `confirm_action` executes the drafted action by id.
- Read tools (`search_listings`, `list_sales`) run immediately.
- No global singletons, no monkey-patching, no edits to shared host config from this module.

## Request / response contract

`POST /agent/message`

```json
{
  "message": "sold 3 bags cement to Mary 1500",
  "product": "neo",
  "userId": "user-123",
  "sessionId": "session-abc"
}
```

`product` is `"neo" | "nyumba"`.

## Adding a tool

1. Add one file under `tools/neo/` or `tools/nyumba/`.
2. Register it in `core/registry.ts` (one line in the product array).
3. Add or reuse a port in `contract.ts` + implement it in stub/real adapters.
