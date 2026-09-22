# Handoff — other developer (before merge)

**Merge touches nothing outside `/agent`.** All code, deps, scripts, and `AGENT_*` env live in this folder. You only add host wiring yourself when ready.

## Read first

1. **`contract.ts`** — dependency-free shapes + ports (`Sale`, `Listing`, `AgentRequest`/`AgentResponse`, `RecordSalePort`, `SearchListingsPort`, `ConfirmActionPort`). Keep these signatures stable.
2. **`INTEGRATION.md`** — single-line `registerAgent(mount, deps)` wiring and Stub → Real swap.
3. **`adapters/real.ts`** — empty `// TODO` template you fill against Neo / Nyumba backends.
4. **`README.md`** — run standalone + curl demos.

## Fill `adapters/real.ts`

Implement every `// TODO` so ports match `contract.ts`:

| Port | Methods |
|------|---------|
| `RecordSalePort` | `draftSale` (no write), `listSales` |
| `SearchListingsPort` | `search` |
| `ConfirmActionPort` | `getDraft`, `confirm` (execute draft by id) |

Then swap in host wiring: `createStubAdapters()` → `createRealAdapters()`.

## Single-line wiring

See **INTEGRATION.md** — call `registerAgent(mount, deps)` once. Routes mounted: `GET /agent/health`, `GET /agent/tools`, `POST /agent/message`.

## Checklist

- [ ] Read `contract.ts` ports
- [ ] Implement `adapters/real.ts` TODOs
- [ ] Set env: `AGENT_ANTHROPIC_API_KEY`, optional `AGENT_PORT`
- [ ] Wire `registerAgent` (INTEGRATION.md); start with StubAdapters locally
- [ ] Confirm routes under `/agent/*` only
- [ ] Keep write tools draft-only; confirm path writes by draft id
- [ ] Do not edit files outside `/agent` for this merge
