/**
 * Free offline demo loop — no Anthropic credits required.
 * Parses simple Neo / Nyumba phrases and runs the same tools + StubAdapters.
 * Enable with AGENT_DEMO_MODE=1 (or deps.demoMode).
 */

import type {
  AgentDeps,
  AgentRequest,
  AgentResponse,
  AgentToolContext,
  DraftActionSummary,
} from "../contract.js";
import { createAgentLogger } from "./logger.js";
import { getToolByName } from "./registry.js";

function extractDraft(data: unknown): DraftActionSummary | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (d.requiresConfirmation === true && typeof d.draftId === "string") {
    return {
      id: d.draftId,
      tool: "record_sale",
      summary:
        typeof d.summary === "string" ? d.summary : "Pending confirmation",
      requiresConfirmation: true,
    };
  }
  return undefined;
}

async function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: AgentToolContext,
  deps: AgentDeps,
): Promise<unknown> {
  const logger = deps.logger ?? createAgentLogger();
  logger.logToolCall({
    name,
    input,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
  });
  const def = getToolByName(ctx.product, name);
  if (!def) return { error: `Unknown tool: ${name}` };
  return def.execute(input, ctx);
}

function parseNeoSale(message: string): Record<string, unknown> | null {
  // e.g. "sold 3 bags cement to Mary 1500"
  const m = message.match(
    /sold\s+(\d+)\s+(.+?)\s+to\s+([A-Za-z][\w\s.-]*?)\s+(\d[\d,]*)/i,
  );
  if (!m) return null;
  return {
    quantity: Number(m[1]),
    item: m[2].trim(),
    customer: m[3].trim(),
    amount: Number(m[4].replace(/,/g, "")),
  };
}

function parseDraftId(message: string): string | null {
  const m = message.match(/agent_draft_[\w]+/i);
  return m ? m[0] : null;
}

function parseNyumbaSearch(message: string): Record<string, unknown> {
  const lower = message.toLowerCase();
  const locations = [
    "westlands",
    "kitengela",
    "ruiru",
    "kilimani",
    "gikomba",
    "nairobi",
    "kajiado",
    "kiambu",
  ];
  const found = locations.find((loc) => lower.includes(loc));
  const fallback = message.replace(/^(find|show|any|search)\s+/i, "").trim();
  const location = found ?? (fallback || "Nairobi");

  const bed = message.match(/(\d+)\s*(?:bed|br|bedroom)/i);
  const price = message.match(
    /(?:under|below|max|<=?)\s*([\d,]+)/i,
  ) ?? message.match(/([\d,]+)\s*(?:kes|ksh)?\s*$/i);
  const near = message.match(/near\s+([A-Za-z][\w\s-]{1,40})/i);

  const out: Record<string, unknown> = {
    location: location.replace(/\b\w/g, (c) => c.toUpperCase()),
  };
  if (bed) out.bedrooms = Number(bed[1]);
  if (price) out.maxPrice = Number(price[1].replace(/,/g, ""));
  if (near) out.nearby = near[1].trim();
  return out;
}

export async function runOfflineLoop(
  input: AgentRequest,
  deps: AgentDeps,
): Promise<AgentResponse> {
  const ctx: AgentToolContext = {
    deps,
    userId: input.userId,
    sessionId: input.sessionId,
    product: input.product,
  };
  const msg = input.message.trim();
  const lower = msg.toLowerCase();

  if (input.product === "neo") {
    if (/confirm/.test(lower)) {
      const draftId = parseDraftId(msg);
      if (!draftId) {
        return {
          reply:
            "[demo mode] To confirm, include the draft id (e.g. confirm agent_draft_…).",
          product: "neo",
          sessionId: input.sessionId,
        };
      }
      const data = await runTool("confirm_action", { draftId }, ctx, deps);
      const ok =
        data && typeof data === "object" && (data as { confirmed?: boolean }).confirmed;
      return {
        reply: ok
          ? `[demo mode] Sale confirmed for ${draftId}.`
          : `[demo mode] Could not confirm ${draftId}: ${JSON.stringify(data)}`,
        product: "neo",
        sessionId: input.sessionId,
        data,
      };
    }

    if (/sale|sales|list|show|recent/.test(lower) && !/sold/.test(lower)) {
      const data = await runTool("list_sales", { scope: "mine" }, ctx, deps);
      return {
        reply: `[demo mode] Here are your sales (stub data):\n${JSON.stringify(data, null, 2)}`,
        product: "neo",
        sessionId: input.sessionId,
        data,
      };
    }

    const sale = parseNeoSale(msg);
    if (sale) {
      const data = await runTool("record_sale", sale, ctx, deps);
      const draft = extractDraft(data);
      return {
        reply: draft
          ? `[demo mode] Draft ready (no write yet).\n${draft.summary}\nReply with: confirm ${draft.id}`
          : `[demo mode] ${JSON.stringify(data)}`,
        product: "neo",
        sessionId: input.sessionId,
        draft,
        data,
      };
    }

    return {
      reply:
        '[demo mode] Try: "sold 3 bags cement to Mary 1500", then "confirm <draftId>", or "show my sales". (Free offline — no Anthropic credits.)',
      product: "neo",
      sessionId: input.sessionId,
    };
  }

  // nyumba
  if (/list|find|show|search|any|land|apartment|bedroom|plot/.test(lower)) {
    const query = parseNyumbaSearch(msg);
    const data = await runTool("search_listings", query, ctx, deps);
    const count =
      data && typeof data === "object" && "count" in data
        ? (data as { count: number }).count
        : 0;
    return {
      reply: `[demo mode] Found ${count} listing(s) for ${JSON.stringify(query)}:\n${JSON.stringify(data, null, 2)}`,
      product: "nyumba",
      sessionId: input.sessionId,
      data,
    };
  }

  return {
    reply:
      '[demo mode] Try: "find 2 bedroom places in Westlands under 100000 near Sarit" or "show land in Ruiru". (Free offline — no Anthropic credits.)',
    product: "nyumba",
    sessionId: input.sessionId,
  };
}
