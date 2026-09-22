/**
 * Optional OpenAI-compatible chat (Groq, Gemini proxy, etc.) — not Anthropic-specific.
 * Uses JSON tool plans when the remote model cannot do native tool_use.
 */

import type {
  AgentDeps,
  AgentRequest,
  AgentResponse,
  AgentToolContext,
  DraftActionSummary,
  Product,
} from "../contract.js";
import { buildSystemPrompt } from "../knowledge.js";
import { createAgentLogger } from "./logger.js";
import { getToolByName, getTools } from "./registry.js";

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

function toolCatalog(product: Product): string {
  return getTools(product)
    .map(
      (t) =>
        `- ${t.name}: ${t.description}\n  schema: ${JSON.stringify(t.inputSchema)}`,
    )
    .join("\n");
}

function parseToolPlan(text: string): {
  tool?: string;
  input?: Record<string, unknown>;
  reply?: string;
} | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fence ? fence[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as {
      tool?: string;
      input?: Record<string, unknown>;
      reply?: string;
    };
  } catch {
    return null;
  }
}

export async function runOpenAiCompatibleLoop(
  input: AgentRequest,
  deps: AgentDeps,
): Promise<AgentResponse> {
  const baseUrl = (deps.llmBaseUrl ?? "").replace(/\/$/, "");
  const apiKey = deps.llmApiKey ?? "";
  const model = deps.llmModel ?? "llama-3.1-8b-instant";
  if (!baseUrl) {
    throw new Error("llmBaseUrl required for openai-compatible provider");
  }

  const logger = deps.logger ?? createAgentLogger();
  const ctx: AgentToolContext = {
    deps,
    userId: input.userId,
    sessionId: input.sessionId,
    product: input.product,
  };

  const system = [
    buildSystemPrompt(input.product),
    "You are a weak but useful tool-using assistant.",
    "Respond with ONLY a JSON object of the form:",
    '{"tool":"<name or null>","input":{...},"reply":"<short user-facing text if no tool>"}',
    "Available tools:",
    toolCatalog(input.product),
  ].join("\n");

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: system },
    { role: "user", content: input.message },
  ];

  let draft: DraftActionSummary | undefined;
  let lastData: unknown;

  for (let i = 0; i < 4; i += 1) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 400)}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim() ?? "";
    const plan = parseToolPlan(content);

    if (!plan?.tool) {
      return {
        reply: plan?.reply || content || "(no reply)",
        product: input.product,
        sessionId: input.sessionId,
        draft,
        data: lastData,
      };
    }

    logger.logToolCall({
      name: plan.tool,
      input: plan.input ?? {},
      userId: input.userId,
      timestamp: new Date().toISOString(),
    });

    const def = getToolByName(input.product, plan.tool);
    let result: unknown;
    if (!def) {
      result = { error: `Unknown tool: ${plan.tool}` };
    } else {
      result = await def.execute(plan.input ?? {}, ctx);
    }
    lastData = result;
    const maybe = extractDraft(result);
    if (maybe) draft = { ...maybe, tool: plan.tool };

    messages.push({ role: "assistant", content });
    messages.push({
      role: "user",
      content: `Tool result for ${plan.tool}: ${JSON.stringify(result)}\nReturn final JSON with tool:null and a clear reply for the user.`,
    });
  }

  return {
    reply: "Stopped after max weak-LLM iterations.",
    product: input.product,
    sessionId: input.sessionId,
    draft,
    data: lastData,
  };
}
