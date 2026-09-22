# Handoff — next developer

**Audience:** whoever wires this into Neo / Nyumba (or reviews before merge).  
**Rule:** merging touches **nothing outside `/agent`**. Host wiring is *your* one-line change later — not part of this folder’s merge.

Canonical product site (docs only, never fetched at runtime): https://codzure-solutions.vercel.app/

---

## Read in this order

1. **`contract.ts`** — all boundary shapes + ports (dependency-free). **Do not break these.**
2. **`INTEGRATION.md`** — `registerAgent(mount, deps)` wiring + Stub → Real swap.
3. **`adapters/real.ts`** — fill every `// TODO`.
4. **`README.md`** — run / curl / browser chat.
5. This file — capabilities + **codes that must work**.

---

## What this module can do (capabilities)

| Product | Capability | Tool | Behavior |
|---------|------------|------|----------|
| **Neo** | Draft a sale from NL | `record_sale` | Returns `{ requiresConfirmation: true, draftId, summary }` — **no write** |
| **Neo** | Confirm drafted sale | `confirm_action` | Executes draft by `draftId` → persists `Sale` |
| **Neo** | List sales | `list_sales` | Read-only, immediate |
| **Nyumba** | Search listings | `search_listings` | Filters by location / bedrooms / maxPrice / nearby — immediate |

Also included:

- Browser chat UI: `GET /agent` (Codzure logo)
- Health / tools discovery
- LLM providers: **`local`** (free weak router, default), **`openai-compatible`** (e.g. Groq), **`anthropic`** (needs credits)
- StubAdapters (seeded in-memory) + RealAdapters template

---

## HTTP surface that must keep working

All under `/agent/*` only. Env vars prefixed `AGENT_*`.

| Method | Path | Must return |
|--------|------|-------------|
| `GET` | `/agent` or `/agent/` | HTML chat (Codzure-branded) |
| `GET` | `/agent/assets/codzure_logo_full.png` | PNG 200 |
| `GET` | `/agent/health` | `{ ok: true, module, products, llm, demoMode, chat }` |
| `GET` | `/agent/tools?product=neo` | Neo tool list |
| `GET` | `/agent/tools?product=nyumba` | Nyumba tool list |
| `POST` | `/agent/message` | `AgentResponse` JSON |

### `POST /agent/message` contract (must not change)

**Request**

```json
{
  "message": "string",
  "product": "neo" | "nyumba",
  "userId": "string",
  "sessionId": "string"
}
```

**Response**

```json
{
  "reply": "string",
  "product": "neo" | "nyumba",
  "sessionId": "string",
  "draft": {
    "id": "agent_draft_…",
    "tool": "record_sale",
    "summary": "…",
    "requiresConfirmation": true
  },
  "data": {}
}
```

`draft` is optional (only after write tools). `data` is optional structured tool output.

---

## Port interfaces that must work (`contract.ts`)

Implement these exactly in `adapters/real.ts`:

### `RecordSalePort`

- `draftSale(input)` → `{ requiresConfirmation: true, draftId, summary }`  
  **Must not** write the sale yet.
- `listSales(userId?)` → `Sale[]`

### `SearchListingsPort`

- `search({ location, bedrooms?, maxPrice?, nearby? })` → `Listing[]`  
  Read-only; run immediately.

### `ConfirmActionPort`

- `getDraft(draftId)` → `DraftAction | null`
- `confirm(draftId)` → `{ ok: true, result } | { ok: false, error }`  
  **This** is where Neo sales are written.

### Guardrails (do not weaken)

1. Write tools draft only → `requiresConfirmation: true`
2. Confirm path executes by id
3. Read tools run immediately
4. No global singletons / monkey-patches / host config edits from this module
5. Persistence ids/prefixes: `agent_` (or host equivalents behind RealAdapters)

---

## Codes / phrases that must work (acceptance)

With **StubAdapters** + `AGENT_LLM_PROVIDER=local` (default free mode):

### Neo — must succeed

```bash
# 1) Draft (must return draft.requiresConfirmation === true)
curl -s -X POST http://127.0.0.1:8787/agent/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "sold 3 bags cement to Mary 1500",
    "product": "neo",
    "userId": "demo-user",
    "sessionId": "neo-1"
  }'

# 2) Confirm (replace DRAFT_ID from step 1)
curl -s -X POST http://127.0.0.1:8787/agent/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "confirm DRAFT_ID",
    "product": "neo",
    "userId": "demo-user",
    "sessionId": "neo-1"
  }'

# 3) List
curl -s -X POST http://127.0.0.1:8787/agent/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "show my sales",
    "product": "neo",
    "userId": "demo-user",
    "sessionId": "neo-1"
  }'
```

### Nyumba — must succeed (real search via port)

```bash
curl -s -X POST http://127.0.0.1:8787/agent/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "find 2 bedroom places in Westlands under 100000 near Sarit",
    "product": "nyumba",
    "userId": "demo-user",
    "sessionId": "ny-1"
  }'

curl -s -X POST http://127.0.0.1:8787/agent/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "show land in Ruiru",
    "product": "nyumba",
    "userId": "demo-user",
    "sessionId": "ny-2"
  }'
```

**Expect:** `data.listings` non-empty for Westlands / Ruiru stubs; human-readable `reply`.

### Smoke (no LLM)

```bash
curl -s http://127.0.0.1:8787/agent/health
curl -s 'http://127.0.0.1:8787/agent/tools?product=neo'
curl -s 'http://127.0.0.1:8787/agent/tools?product=nyumba'
# Browser: open /agent and Send the same phrases
```

### Compile gates

```bash
cd agent
npm install
npm run typecheck
npm run build
```

Both must pass before merge.

---

## LLM providers (not Anthropic-only)

| `AGENT_LLM_PROVIDER` | Needs money? | Notes |
|----------------------|--------------|-------|
| `local` (default) | No | Weak local NLU → same tools. Good for demos / CI. |
| `openai-compatible` | Free tier possible | Set `AGENT_LLM_BASE_URL`, `AGENT_LLM_API_KEY`, `AGENT_LLM_MODEL` (e.g. Groq). |
| `anthropic` | Credits required | `AGENT_ANTHROPIC_API_KEY` — failed here when balance was $0. |

See `.env.example`. Never commit `.env`.

---

## How to wire into the host (single mount)

Details in **INTEGRATION.md**. Minimal shape:

```ts
import { registerAgent, createStubAdapters /* → createRealAdapters */ } from "./agent/index.js";

registerAgent((path, method, handler) => {
  app[method.toLowerCase()](path, async (req, res) => {
    const out = await handler({ body: req.body, query: req.query, headers: req.headers });
    // honor out.contentType for HTML chat if you mount GET /agent
    res.status(out.status).type(out.contentType ?? "json").send(
      out.contentType?.includes("html") ? out.body : out.body
    );
  });
}, {
  ...createStubAdapters(), // swap to createRealAdapters() in prod
  anthropicApiKey: process.env.AGENT_ANTHROPIC_API_KEY ?? "unused",
  llmProvider: (process.env.AGENT_LLM_PROVIDER as "local" | "anthropic" | "openai-compatible") ?? "local",
  demoMode: process.env.AGENT_DEMO_MODE === "1",
});
```

---

## Adding a tool (pattern that must stay)

1. New file under `tools/neo/` or `tools/nyumba/` exporting `AgentToolDefinition`
2. One line in `core/registry.ts`
3. Port method in `contract.ts` + stub + real adapter

Knowledge stays in `knowledge.ts` — **never** mix product facts into tool files.

---

## File map (quick)

```
agent/
  contract.ts          ← MUST stay stable (merge point)
  knowledge.ts         ← static facts + SOURCE_URL
  index.ts             ← registerAgent / handleAgentMessage
  demo-ui.ts           ← browser chat HTML
  assets/              ← Codzure logos
  core/loop.ts         ← provider router
  core/weak-llm.ts     ← free local agent
  core/openai-compat.ts
  core/registry.ts
  core/logger.ts       ← logs every tool call
  adapters/stub.ts     ← default seeded data
  adapters/real.ts     ← YOUR TODOs
  tools/neo/*  tools/nyumba/*
  HANDOFF.md  HANDOFF.html  HANDOFF.pdf
  INTEGRATION.md  README.md
```

Shareable handoff for the next developer:

- Markdown: `HANDOFF.md`
- HTML: `HANDOFF.html` (open in browser; logo via `assets/`)
- PDF: `HANDOFF.pdf` (print-ready, 5 pages)

Temporary public demo (while tunnel is up): **https://demoagent.loca.lt/agent**

---

## Pre-merge checklist

- [ ] `npm run typecheck` + `npm run build` green
- [ ] Neo draft → confirm → list works (codes above)
- [ ] Nyumba Westlands + Ruiru search returns listings
- [ ] `GET /agent` chat loads with Codzure logo
- [ ] `adapters/real.ts` TODOs planned / implemented for prod
- [ ] Env only `AGENT_*`; routes only `/agent/*`
- [ ] Write tools still require confirmation
- [ ] No edits outside `/agent` for this merge
- [ ] Secrets never committed (`.env` gitignored)

---

## Known demo limits

- Temporary Cloudflare tunnel dies with the cloud agent VM — not a production host.
- Anthropic path needs billing; local path does not.
- Stub listings/sales are in-memory sample data until RealAdapters are filled.
