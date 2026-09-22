# Codzure Agentic AI Module

Standalone agent for **Neo / NeoBuk** (SME sales & ops) and **Nyumba Zetu / Ask Nyumbani** (property discovery).  
Everything lives in this folder. Imports nothing from outside `/agent`.

Canonical product site (static reference only): https://codzure-solutions.vercel.app/

## Quick start (standalone)

```bash
cd agent
cp .env.example .env   # AGENT_DEMO_MODE=1 = free offline (no paid API)
npm install
npm start              # or: npm run agent:dev
```

**No money / no Anthropic credits?** Default is a **weak local LLM** (`AGENT_LLM_PROVIDER=local`) that still runs real `search_listings` / `record_sale` tools on StubAdapters. Optional: free Groq key via `openai-compatible` (see `.env.example`).

Server defaults to `http://127.0.0.1:8787` (`AGENT_PORT`). Uses **StubAdapters** (in-memory sample sales + listings).

**Chat in the browser:** open `/agent` (e.g. `http://127.0.0.1:8787/agent`) — type messages there; you do not need curl.

```bash
npm run typecheck
npm run build
```

## Layout

```
agent/
  contract.ts       # shared shapes + ports (dependency-free)
  knowledge.ts      # product fact-sheet + SOURCE_URL (no runtime fetch)
  index.ts          # registerAgent / handleAgentMessage
  dev.ts            # standalone HTTP runner
  core/loop.ts      # Anthropic tool-calling loop
  core/registry.ts  # getTools("neo" | "nyumba")
  core/logger.ts    # logs every tool call
  adapters/stub.ts  # in-memory defaults
  adapters/real.ts  # TODO template for real backends
  tools/neo/        # record_sale, confirm_action, list_sales
  tools/nyumba/     # search_listings
  INTEGRATION.md    # host wiring (single-line style)
  HANDOFF.md        # other-dev checklist before merge
```

## Other-dev handoff

See **[HANDOFF.md](./HANDOFF.md)** — what to read first, how to fill `adapters/real.ts`, wiring pointer, merge safety, checklist.

## Adding a tool

1. New file under `tools/neo/` or `tools/nyumba/` exporting an `AgentToolDefinition`.
2. One registry line in `core/registry.ts`.
3. One port (or reuse) in `contract.ts` + stub/real adapter methods.

## Example curls — Neo

Requires `npm start` in this folder. `/agent/message` needs a real `AGENT_ANTHROPIC_API_KEY`. Health/tools work with StubAdapters even when the key is a placeholder used only to boot the server.

```bash
# 1) Health
curl -s http://127.0.0.1:8787/agent/health | jq

# 2) List Neo tools
curl -s 'http://127.0.0.1:8787/agent/tools?product=neo' | jq

# 3) Draft a sale (LLM → record_sale → requiresConfirmation)
curl -s -X POST http://127.0.0.1:8787/agent/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "sold 3 bags cement to Mary 1500",
    "product": "neo",
    "userId": "demo-user",
    "sessionId": "neo-session-1"
  }' | jq

# 4) Confirm draft (replace agent_draft_xxxx with draftId from step 3)
curl -s -X POST http://127.0.0.1:8787/agent/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "confirm draft agent_draft_xxxx",
    "product": "neo",
    "userId": "demo-user",
    "sessionId": "neo-session-1"
  }' | jq

# 5) List my sales
curl -s -X POST http://127.0.0.1:8787/agent/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "show my recent sales",
    "product": "neo",
    "userId": "demo-user",
    "sessionId": "neo-session-1"
  }' | jq
```

## Example curls — Nyumba

```bash
# 1) List Nyumba tools
curl -s 'http://127.0.0.1:8787/agent/tools?product=nyumba' | jq

# 2) Search apartments (LLM → search_listings)
curl -s -X POST http://127.0.0.1:8787/agent/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "find 2 bedroom places in Westlands under 100000 near Sarit",
    "product": "nyumba",
    "userId": "demo-user",
    "sessionId": "nyumba-session-1"
  }' | jq

# 3) Land / plot search
curl -s -X POST http://127.0.0.1:8787/agent/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "show land in Ruiru",
    "product": "nyumba",
    "userId": "demo-user",
    "sessionId": "nyumba-session-2"
  }' | jq

# 4) Broader Nairobi search
curl -s -X POST http://127.0.0.1:8787/agent/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "any listings in Kilimani?",
    "product": "nyumba",
    "userId": "demo-user",
    "sessionId": "nyumba-session-3"
  }' | jq
```

### Live LLM note

- **Free:** `AGENT_DEMO_MODE=1` — offline tool routing, no Anthropic credits.
- **Full LLM:** set `AGENT_ANTHROPIC_API_KEY` and turn demo mode off. Needs Anthropic billing/credits.

## Guardrails

- Write tools return `{ requiresConfirmation: true, summary }` — no direct write.
- Confirm path executes drafted action by id.
- Read tools run immediately.
- Env: `AGENT_*` only. Logger stays inside `/agent`.

## Host integration

See [INTEGRATION.md](./INTEGRATION.md). Merging this module does not require changing anything outside `/agent`.
