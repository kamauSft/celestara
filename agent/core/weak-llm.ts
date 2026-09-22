/**
 * Weak local LLM router — free, no Anthropic/remote credits.
 * Classifies intent and calls the same Neo/Nyumba tools (real search via ports).
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
  const patterns = [
    /sold\s+(\d+)\s+(.+?)\s+to\s+([A-Za-z][\w\s.'-]{0,40}?)\s+(?:for\s+)?(?:KES|Ksh|ksh)?\s*(\d[\d,]*)/i,
    /(\d+)\s+(.+?)\s+(?:to|for)\s+([A-Za-z][\w\s.'-]{0,40}?)\s+(?:at\s+)?(?:KES|Ksh)?\s*(\d[\d,]*)/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    if (m) {
      return {
        quantity: Number(m[1]),
        item: m[2].trim(),
        customer: m[3].trim(),
        amount: Number(m[4].replace(/,/g, "")),
      };
    }
  }
  return null;
}

function parseDraftId(message: string): string | null {
  const m = message.match(/agent_draft_[\w]+/i);
  return m ? m[0] : null;
}

const KNOWN_AREAS = [
  "westlands",
  "kitengela",
  "ruiru",
  "kilimani",
  "gikomba",
  "nairobi",
  "kajiado",
  "kiambu",
  "karen",
  "langata",
  "syokimau",
  "thika",
];

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseNyumbaSearch(message: string): Record<string, unknown> {
  const lower = message.toLowerCase();
  const found = KNOWN_AREAS.find((loc) => lower.includes(loc));
  let location = found ? titleCase(found) : "";
  if (!location) {
    const nearWord = message.match(
      /(?:in|at|around|near)\s+([A-Za-z][A-Za-z\s-]{1,30}?)(?:\s+under|\s+with|\s+near|$|,)/i,
    );
    location = nearWord ? nearWord[1].trim() : "Nairobi";
  }

  const bed = message.match(/(\d+)\s*(?:bed|br|bedroom)/i);
  const price =
    message.match(/(?:under|below|max|upto|up to|<=?)\s*([\d,]+)/i) ??
    message.match(/([\d]{4,})\s*(?:kes|ksh)?/i);
  const near = message.match(
    /near\s+([A-Za-z][\w\s-]{1,40}?)(?:\s+under|\s+with|$|,|\.)/i,
  );

  const out: Record<string, unknown> = { location };
  if (bed) out.bedrooms = Number(bed[1]);
  if (price) out.maxPrice = Number(price[1].replace(/,/g, ""));
  if (near && !KNOWN_AREAS.includes(near[1].trim().toLowerCase())) {
    out.nearby = near[1].trim();
  } else if (/sarit/i.test(message)) {
    out.nearby = "Sarit";
  }
  return out;
}

function formatListings(data: unknown): string {
  if (!data || typeof data !== "object") return String(data);
  const d = data as { count?: number; listings?: Array<Record<string, unknown>> };
  const listings = d.listings ?? [];
  if (!listings.length) {
    return "No listings matched. Try another area (Westlands, Ruiru, Kitengela, Kilimani…).";
  }
  const lines = listings.map((L, i) => {
    const beds = L.bedrooms != null ? `${L.bedrooms} BR · ` : "";
    const near = Array.isArray(L.nearby) ? ` · near ${(L.nearby as string[]).join(", ")}` : "";
    return `${i + 1}. ${L.title}\n   ${beds}${L.location} · ${L.currency ?? "KES"} ${Number(L.price).toLocaleString()}${near}`;
  });
  return `Found ${d.count ?? listings.length} listing(s):\n\n${lines.join("\n\n")}`;
}

/**
 * Weak local model path — still executes real tool/port searches.
 */
export async function runWeakLocalLoop(
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
            "To confirm a sale, paste the draft id (starts with agent_draft_…).",
          product: "neo",
          sessionId: input.sessionId,
        };
      }
      const data = await runTool("confirm_action", { draftId }, ctx, deps);
      const ok =
        data &&
        typeof data === "object" &&
        (data as { confirmed?: boolean }).confirmed;
      return {
        reply: ok
          ? `Sale recorded. Draft ${draftId} confirmed.`
          : `Could not confirm: ${JSON.stringify(data)}`,
        product: "neo",
        sessionId: input.sessionId,
        data,
      };
    }

    if (
      (/sale|sales|list|show|recent|history/.test(lower) && !/sold/.test(lower)) ||
      /^list\b/.test(lower)
    ) {
      const data = await runTool("list_sales", { scope: "mine" }, ctx, deps);
      return {
        reply: `Your sales:\n${JSON.stringify(data, null, 2)}`,
        product: "neo",
        sessionId: input.sessionId,
        data,
      };
    }

    const sale = parseNeoSale(msg);
    if (sale || /sold|sell|sale|record/.test(lower)) {
      if (!sale) {
        return {
          reply:
            'Tell me like: "sold 3 bags cement to Mary 1500" and I will draft it for confirmation.',
          product: "neo",
          sessionId: input.sessionId,
        };
      }
      const data = await runTool("record_sale", sale, ctx, deps);
      const draft = extractDraft(data);
      return {
        reply: draft
          ? `Draft ready (not saved yet):\n${draft.summary}\n\nReply: confirm ${draft.id}`
          : JSON.stringify(data),
        product: "neo",
        sessionId: input.sessionId,
        draft,
        data,
      };
    }

    return {
      reply:
        'Neo demo (weak local model). Try:\n• "sold 3 bags cement to Mary 1500"\n• "confirm agent_draft_…"\n• "show my sales"',
      product: "neo",
      sessionId: input.sessionId,
    };
  }

  // Nyumba — always attempt search when it looks like a property query
  if (
    /list|find|show|search|any|land|apartment|house|bedroom|plot|rent|buy|near|in\s+\w/.test(
      lower,
    ) ||
    KNOWN_AREAS.some((a) => lower.includes(a))
  ) {
    const query = parseNyumbaSearch(msg);
    const data = await runTool("search_listings", query, ctx, deps);
    return {
      reply: formatListings(data),
      product: "nyumba",
      sessionId: input.sessionId,
      data,
    };
  }

  return {
    reply:
      'Nyumba Zetu demo (weak local model). Try:\n• "find 2 bedroom places in Westlands under 100000 near Sarit"\n• "show land in Ruiru"\n• "listings in Kilimani"',
    product: "nyumba",
    sessionId: input.sessionId,
  };
}
