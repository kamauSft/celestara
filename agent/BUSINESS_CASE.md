# Business case: a top 0.5% agentic layer for Neo & Nyumba Zetu

**Codzure Solutions · Neo (NeoBuk) + Nyumba Zetu (Ask Nyumbani)**  
**Decision this document supports:** what to build, what to refuse, and how to know we are in the top 1% of agentic product AI — not another chat widget. A CVM slide is optional; the agent loop is not.  
**Source of product truth:** [codzure-solutions.vercel.app](https://codzure-solutions.vercel.app/)

---

## 1. The verdict (read this first)

We do **not** win by wrapping Claude in a chat box. That is the default 99.5% of “AI features” shipping in 2026: a text field, a system prompt, and hope.

We win if the agent **finishes a job the user already pays for with time, cash, or fear** — then waits for a yes before anything important is saved.

| Product | The job that actually matters | If we miss this, we are average |
|---|---|---|
| **Neo** | “Sold 3 bags cement to Mary, 1,500” becomes a structured sale **draft**, and “who owes me?” is answered from **this shop’s** books | A chatbot that talks about bookkeeping |
| **Nyumba Zetu** | “3-bed Ruaka under 8M near a school” returns **real listings**, and title fear gets a **walkthrough**, not a blog post | Another listings site with an FAQ bot |

**One engine, two toolkits.** Same reasoning core, same confirm-before-write rule, same eval harness. Only the actions and the product facts change. Every improvement to the brain lifts both apps.

**Recommended stance:** treat Phase 1 as a *useful object someone can hold*, not a slide. Ship two flagship tools on stub data, measure whether people say “wait — that’s actually useful,” then swap stubs for the real backend. Do not expand the tool surface until those two jobs are boringly reliable.

---

## 2. What “top 0.5%” actually means

“Top 0.5%” is not model brand, token volume, or a prettier transcript. It is a **product standard**:

1. **Job completion, not conversation.** The unit of value is a confirmed action or a grounded answer from live data.
2. **The model is a router, not the product.** Tools, contracts, and confirmation are the product. The LLM is replaceable.
3. **Write gates are sacred.** Anything that touches money, inventory, listings, or records returns a draft. Reads run immediately. There is no silent write.
4. **Grounded in the user’s world.** Neo answers from *this* shop. Nyumba searches *these* listings. Knowledge (who built it, what the product is) is separate from tools (what it can do).
5. **Eval before vibe.** A frozen set of golden tasks must pass on every change. If a sale parse or a Ruaka search regresses, we do not ship.
6. **Works where the user already is.** Phone-first. Later: WhatsApp. English + Sheng/Swahili mix in the same utterance.
7. **Honest about limits.** Due diligence is a checklist and red-flag guide, **not** a legal opinion and **not** an ArdhiSasa replacement. Top products earn trust by declining.

If we cannot point to evidence for those seven, we are not in the 0.5%. We are in the chat-widget pile.

### What the other 99.5% looks like (and we will look like this if we are sloppy)

- A floating “Ask AI” that restates the marketing site.
- Unbounded writes (“I recorded 12 sales”) with no draft.
- Hallucinated listings or invented customer balances.
- One giant prompt, no ports, so merge with the other developer becomes a rewrite.
- No logs, no golden tests, no way to say “this got worse.”
- Due diligence that sounds confident and is legally reckless.
- Desktop-only demo that dies without an API key.

---

## 3. Why this is the right problem (and why now)

**Neo’s buyer** is an SME owner who currently keeps the business in their head, a notebook, or WhatsApp threads. They do not want software. They want the afternoon back, and they want to stop leaking money (unpaid credit, dead stock, mystery margins). Codzure already positions NeoBuk as sales, expenses, inventory, operational workflows — the agent must *operate* those, not describe them.

**Nyumba’s buyer** is not hunting a novelty chatbot. They are trying not to get scammed on land in Nairobi / Kiambu / Ruaka / Syokimau / Karen / Westlands. Competitors (classifieds, Facebook, agents, listing portals) barely offer title guidance. That fear is the wedge. Search gets them in; due diligence is why they stay; seller drafts grow supply.

**Studio constraint that is actually an advantage:** one Nairobi studio, two products, parallel development. A shared agent brain is cheaper than two AI projects and more defensible than a one-off feature. Isolation (`/agent`, `AGENT_` env, stub adapters) is how we stay fast *and* merge-safe.

**Why agentic, not “chat + search”:** chat that cannot record a sale is a toy. Search that cannot walk title risk is a filter UI with extra words. Agentic means: parse intent → call a port → show a draft or a result → loop until the job is done.

---

## 4. Competitive map (be precise)

We are not competing with “ChatGPT.” We are competing with the user’s current workaround.

### Neo

| Current workaround | What they tolerate | Where we beat it |
|---|---|---|
| Notebook / memory | Fast, zero cost, zero insight | Parse speech/text into a ledger; weekly performance; overdue list |
| WhatsApp + M-Pesa | Already habitual | Same channel later; structured books, not chat archaeology |
| Spreadsheet / generic accounting | Powerful, heavy | 5-second sale, not a chart of accounts |
| Generic AI chat | Fluent, ungrounded | **This shop’s** numbers; confirmation; alerts with a suggested next action |

### Nyumba Zetu

| Current workaround | What they tolerate | Where we beat it |
|---|---|---|
| BuyRentKenya / Property24 / Jiji | Inventory | Conversation instead of 12 checkboxes; **title checklist on the listing** |
| Facebook + brokers | Access, high fraud risk | Red flags, documents to demand, “do not pay cash today” |
| Advocate (late in the journey) | Real safety, expensive, after emotional commitment | Earlier, cheaper *guidance* that gets them to the advocate with a packet, not a panic |
| Generic AI | Sounds like a lawyer | Grounded in **this listing’s** title status + comps; never impersonates counsel |

**The only durable moat** is not the model. It is (a) Kenyan operational texture, (b) confirmed writes into the real apps, (c) diligence UX nobody else bothers to productise, (d) data from confirmed actions, (e) WhatsApp distribution when we have earned it.

---

## 5. Product principles (non-negotiable)

1. **Purely additive module.** Everything lives in `/agent`. No edits to the other developer’s files. Merge is `registerAgent(...)` plus swapping stub adapters for real ones. Contract lives in one file.
2. **Ports, not hard-wiring.** The brain asks for `RecordSalePort` / `SearchListingsPort`. Stubs today, real functions later, same brain.
3. **Confirm before write. Read immediately.** This is the trust product. Without it, SMEs will not let us near money.
4. **Knowledge ≠ tools.** Facts about Codzure / Neo / Nyumba are static (offline). Tools are actions. The agent may link to the studio site; it must not scrape it at runtime.
5. **Two products, one confirmation language.** Same draft object, same yes/no path, different payloads.
6. **Local usefulness without a key.** A demo that dies without `AGENT_ANTHROPIC_API_KEY` is not something you can put in a real person’s hands. A deterministic operations brain (parse → same tools → same drafts) is the fallback. Claude is the upgrade, not the floor.
7. **Decline well.** If the user asks to skip a title search, pay a seller in cash, or invent a balance, the agent refuses and says why.

---

## 6. Architecture that keeps us in the 0.5% (reasonable, not a science project)

```
User (app · later WhatsApp)
        │
        ▼
 /agent/index.ts     registerAgent · handleAgentMessage
        │
        ▼
 core/loop           LLM tool loop  ──or──  local operations brain
        │
        ▼
 core/registry       getTools("neo" | "nyumba")
        │
        ▼
 tools/*             record_sale · search_listings · diligence · alerts · …
        │
        ▼
 ports (contract.ts) ── stub adapters (now) ── real adapters (merge)
        │
        ▼
 Host Neo / Nyumba backends (someone else’s code — we never edit it)
```

**The merge contract (agree this before splitting work):** `Sale`, `Listing`, `AgentRequest`, `AgentResponse`, every Port interface. One file. If a “sale” means different fields in Neo vs the agent, the merge will fail no matter how good the prompts are.

**What we explicitly will not build:** a heavyweight agent framework, a new vector database for Phase 1, autonomous payments, a custom model, scraping ArdhiSasa, or editing host config files.

---

## 7. What to build — ranked (this is the actual plan)

Build in this order. Do not skip down the list because a demo looks better on a slide.

### P0 — Flagship jobs (must be true before we call it a product)

| # | Capability | Product | Why it is P0 | Done when |
|---|---|---|---|---|
| 1 | **Record sale from natural language → draft → confirm** | Neo | This is the “notebook replacement.” | “sold 3 bags cement to Mary, 1,500” yields quantity, item, customer, KES, `requiresConfirmation: true`, and confirm writes once. Mixed Swahili/English still works. |
| 2 | **Search listings from a sentence** | Nyumba | This is the “filters are friction” promise. | “3-bedroom in Ruaka under 8M near a school” returns real stub (then live) matches, not a recap of the query. |
| 3 | **Confirm / discard by id** | Both | Without this, writes are either blocked forever or unsafe. | UI and API can commit or drop a draft without re-parsing the sentence. |
| 4 | **Golden eval set + tool logs** | Both | This is how 0.5% teams ship. | ~20 frozen utterances per product; CI fails on parse/search regressions; every tool call logged (name, input, userId, time). |
| 5 | **Standalone runner on stub data** | Both | Parallel work + investor/user demo. | `cd agent && npm run dev` works with no host app. Isolation rules held. |

### P1 — The reasons people *choose* us (still reasonable)

| # | Capability | Product | Why | Done when |
|---|---|---|---|---|
| 6 | **Due diligence walkthrough bound to a listing** | Nyumba | Standout vs every listings site. | Given a listing id, user gets documents to demand, official-search steps, red flags tuned to `titleStatus` (clean / unverified / disputed). Always: not legal advice. |
| 7 | **Insights from own data** | Neo | “How did we perform this week?” | Answers use stub/live sales & expenses, not invented percentages. |
| 8 | **Outstanding balances** | Neo | Credit culture is how Kenyan shops leak money. | Named customers, amounts, age of debt. |
| 9 | **Proactive alerts as drafts** | Neo | Agent watches; owner approves. | Low stock, overdue receivables, margin below cost band — each with a suggested action, never auto-ordered stock. |
| 10 | **Seller draft listing + comps** | Nyumba | Grow supply; price from comparables, not vibes. | Draft listing requires confirm; suggested price shows sample size and range. |

### P2 — Distribution and “magical” (only after P0 is boring)

| # | Capability | Why wait |
|---|---|---|
| 11 | WhatsApp channel | Same brain, different adapter. Worthless if P0 is flaky. |
| 12 | Real ArdhiSasa / lands search **partnership** (not scrape) | Legal and operational; stub checklist first. |
| 13 | Voice notes → same sale parser | High leverage on mobile; parser must already be solid. |
| 14 | Multi-shop / staff roles | After a single owner trusts it. |
| 15 | Resale marketplace assistant | Nyumba has this product surface; do not dilute land trust to chase it early. |

### Explicit non-goals (protect the 0.5%)

- General “ask me anything” about the world.
- Auto-sending demand messages to customers without confirmation.
- Guaranteeing a title is clean.
- Building two separate agents.
- Fine-tuning a model before we have 1,000 confirmed actions.
- Letting the LLM invent listings, prices, or balances when a port returns empty.

---

## 8. Flagship journeys (design these, not “a chat UI”)

### Neo — 20 seconds that replace a notebook

1. Owner: “sold 3 bags cement to Mary 1500.”
2. Agent shows a **draft card**: Mary · 3 × bags cement · KES 1,500 total · unpaid? ask once.
3. Owner taps **Confirm**. Ledger updates. Stock can decrement only after confirm (and only if inventory port exists).
4. Later: “who has outstanding balances?” → Otieno 12 days, Amina 21 days, Mary paint 9 days.
5. Alert: “Cement is at 4 bags, reorder at 12. Draft a restock note?” — still a draft.

### Nyumba — search, then safety

1. Buyer: “3-bedroom in Ruaka under 8M near a school.”
2. Agent returns 1–3 **real** listings with price, title status, nearby.
3. Buyer: “walk me through checking the cheap plot.”
4. Agent loads **that listing**, not a generic essay: if `unverified` or `disputed`, overall risk is high; checklist includes original title, ID match, land rates, spousal consent, official search, survey, advocate client account — **never cash in a car park**.
5. Seller path: “list my 1/8 in Ruaka” → draft + comps → confirm.

If a reviewer only has three minutes, they should see journey 1 and journey 4. That is the competitive demo.

---

## 9. Operating system of a 0.5% agent team

Shipping tools is table stakes. The operating system is the separator.

**Golden tasks (examples to freeze immediately)**

Neo:

- “sold 3 bags cement to Mary, 1,500”
- “nimeuzia Kamau mifuko 2 ya cement 1700”
- “how did we perform this week?”
- “who owes me?”
- “anything I should worry about?”
- “yes” / “confirm” after a draft
- “what is Neo / who built this?” → studio facts + source URL, no tools required

Nyumba:

- “3-bedroom in Ruaka under 8M near a school”
- “land in Kiambu”
- “is the Ruaka plot safe to buy?”
- “what documents do I demand?”
- “what should I list my 2-bed Syokimau for?”
- “who built this / where do I learn more?”

**Pass criteria:** structured fields within tolerance (price in KES, not USD; Ruaka ≠ Karen); no fabricated listing ids; write tools never commit in the same turn as parse.

**Logs:** every tool call: name, input, userId, timestamp. Weekly review: confirmation rate, discard rate, empty-search rate, “I don’t know” rate.

**Quality bar on due diligence copy:** reviewed by someone who has actually done a Kenyan conveyance, even informally. Wrong legal steps are worse than no AI.

**LLM vs local brain:** if the API is missing or fails, the same tools still run. Top 0.5% in African mobile contexts means **degraded mode still completes the job**.

---

## 10. Trust, legal, and brand risk (especially Nyumba)

This is not a footnote. Land fraud is the reason the product exists; it is also how we get sued or lose the studio’s name.

| Rule | Practice |
|---|---|
| The agent is a **guide**, not an advocate | Fixed disclaimer on every diligence report |
| No payment instructions to personal M-Pesa of “the seller’s cousin” | Hardcoded refusal + safer path (advocate client account / official process) |
| Title status on a listing is **data**, not a verdict | Language: “this listing is marked unverified — treat as high risk until an official search” |
| Studio knowledge is static | No live crawl of the marketing site |
| Confirmations are auditable | Draft id, payload, user, time — host can persist later |

Neo risk is quieter but real: double-recorded sales, wrong totals, “paid” vs credit. Confirmation UI must show **item, qty, person, total KES, paid/unpaid** in one glance, on a phone.

---

## 11. Economics (keep it reasonable)

- **Cost:** one Sonnet-class tool loop is cheap next to a missed unpaid invoice or a bad land deposit. Still: cap turns per request, keep tools tight, cache nothing that must be live.
- **Build cost that actually matters:** contract alignment, evals, diligence copy, stub quality — not GPU.
- **Leverage:** one brain × two products × (app + later WhatsApp) is the studio-level reason to do this.
- **Do not** spend on fine-tuning, multi-agent theatre, or a custom orchestration framework. Anthropic tool use + a 50-line loop is enough.
- **Price later.** First prove a shop owner records a real sale and a buyer finishes a diligence checklist. Monetisation follows trust.

---

## 12. How the two developers actually work

| Role | Owns | Does not own |
|---|---|---|
| Agent developer | `/agent`, stubs, tools, loop, evals, INTEGRATION.md | Host screens, databases, auth |
| Host developer | Neo / Nyumba apps, real data, that **one** `registerAgent` call | Prompts, tool schemas |
| Both, once | `contract.ts` field names | — |

**Merge rule:** if you need to touch a file outside `/agent` besides that one call, the design has already failed.

**Swap rule:** stubs → real is one adapter file. If you are rewriting the loop to “connect the backend,” the ports were too weak.

---

## 13. Scorecard (how we know we are in the 0.5%)

Use these, not vanity token counts.

| Metric | Healthy | We are average if… |
|---|---|---|
| Time to first **confirmed** Neo sale in a demo | Under a minute, including the yes | User chats for five minutes and nothing is saved |
| Confirmation rate of drafts | People tap yes because the draft is right | They retype the sale into the old form |
| Listing search precision on golden queries | Right area + price band + bedroom constraint | “Here is a generic 3-bed somewhere in Nairobi” |
| Diligence completion | User reaches “next actions” on a specific listing | Generic 800-word essay |
| Empty / unknown handling | “I don’t have a listing in Karen under 2M” | Invented properties |
| Eval suite | Runs on every change | “It felt better this afternoon” |
| Isolation | Host repo greps clean except one mount | Shared configs, global singletons |
| Degraded mode | Flagship jobs work without an API key | Demo cancelled because the key was missing |

---

## 14. Decision checklist (what leadership should approve)

Approve this plan if you agree:

1. We are building **an operator**, not a mascot.
2. **Two flagship tools + confirmation + evals** before any WhatsApp or extra tools.
3. **Due diligence is the Nyumba differentiator**, written as guidance with a lawyer-shaped disclaimer — not as a title guarantee.
4. **One contract file** is the meeting point with the other developer.
5. We will **kill or rewrite** any tool that writes without a draft.
6. We will **not** start a second agent stack for the second product.

If that is not the plan, do not spend a model budget. Ship better filters and a cleaner sale form instead — it will outperform a vague chatbot.

---

## 15. Immediate next actions (capability order, not a calendar)

1. **Lock `contract.ts`** with the other developer: `Sale`, `Listing`, `AgentRequest`, `AgentResponse`, ports. This is the only meeting that must happen before parallel work.
2. **Freeze 20+20 golden utterances** (Neo / Nyumba), including Sheng mix and “who built this.”
3. **Write the two flagship tools** against in-memory stubs (Kenyan seed data, not lorem ipsum).
4. **Confirmation protocol** (draft id, commit, discard) used by both products.
5. **Standalone `/agent` runner + one-line INTEGRATION.md.** Put it in a real owner’s and a real buyer’s hands. Listen for “useful,” not “cool.”
6. **Only then:** diligence bound to listings, Neo alerts, seller comps, then WhatsApp as a channel adapter.

That sequence *is* the competitive, reasonable solution. Everything else is theatre.

---

## Appendix A — Tool registry we should end up with

**Neo:** `record_sale` (write/draft), `record_expense` (write/draft), `get_performance`, `get_outstanding`, `get_alerts`, `confirm_action`, `discard_action`.

**Nyumba:** `search_listings`, `run_due_diligence`, `draft_listing` (write/draft), `suggest_price`, `confirm_action`, `discard_action`.

Adding a tool later = one file + one registry line + one port. If it takes more than that, the registry has rotted.

## Appendix B — Isolation rules (copy into INTEGRATION.md when we build)

- Import nothing from outside `/agent`.
- HTTP under `/agent/*`. Env: `AGENT_*`. Storage prefix `agent_`.
- No global singletons, no monkey-patching, no host file edits.
- Default adapters: in-memory stubs. `real.ts` is TODOs the host fills.

## Appendix C — Product facts the agent must not get wrong

- Studio: Codzure Solutions, Karen, Nairobi. Site: https://codzure-solutions.vercel.app/
- Neo = NeoBuk: SME workspace (sales, expenses, inventory, workflows).
- Nyumba Zetu = Ask Nyumbani: East African property/land discovery; title-checklist; resale marketplace; markets include Nairobi, Kiambu, Westlands, Ruaka, Syokimau, Karen.
- Currency: KES.
- Diligence: guide, not a legal determination.
