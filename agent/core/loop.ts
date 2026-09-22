/**
 * Agent loop router:
 * - local (default free): weak local NLU + real tools
 * - openai-compatible: Groq / other free-tier OpenAI APIs
 * - anthropic: Claude tool loop (needs credits)
 */

import Anthropic from "@anthropic-ai/sdk";
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
import { runOpenAiCompatibleLoop } from "./openai-compat.js";
import { getToolByName, getTools } from "./registry.js";
import { runWeakLocalLoop } from "./weak-llm.js";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const MAX_ITERATIONS = 8;

type AnthropicTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

function toAnthropicTools(product: Product): AnthropicTool[] {
  return getTools(product).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as AnthropicTool["input_schema"],
  }));
}

function extractDraft(data: unknown): DraftActionSummary | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (d.requiresConfirmation === true && typeof d.draftId === "string") {
    return {
      id: d.draftId,
      tool: typeof d.tool === "string" ? d.tool : "record_sale",
      summary: typeof d.summary === "string" ? d.summary : "Pending confirmation",
      requiresConfirmation: true,
    };
  }
  return undefined;
}

function resolveProvider(deps: AgentDeps): AgentDeps["llmProvider"] {
  if (deps.llmProvider) return deps.llmProvider;
  if (deps.demoMode) return "local";
  if (deps.llmBaseUrl) return "openai-compatible";
  if (deps.anthropicApiKey && deps.anthropicApiKey !== "demo-offline") {
    return "anthropic";
  }
  return "local";
}

export async function runAgentLoop(
  input: AgentRequest,
  deps: AgentDeps,
): Promise<AgentResponse> {
  const provider = resolveProvider(deps);

  if (provider === "local") {
    return runWeakLocalLoop(input, deps);
  }

  if (provider === "openai-compatible") {
    return runOpenAiCompatibleLoop(input, deps);
  }

  const logger = deps.logger ?? createAgentLogger();
  const client = new Anthropic({ apiKey: deps.anthropicApiKey });
  const model = deps.model ?? DEFAULT_MODEL;
  const tools = toAnthropicTools(input.product);

  const toolCtx: AgentToolContext = {
    deps,
    userId: input.userId,
    sessionId: input.sessionId,
    product: input.product,
  };

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: input.message },
  ];

  let draft: DraftActionSummary | undefined;
  let lastData: unknown;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations += 1;

    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: buildSystemPrompt(input.product),
      tools: tools as Anthropic.Tool[],
      messages,
    });

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    const textParts = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text);

    if (toolUses.length === 0 || response.stop_reason === "end_turn") {
      return {
        reply: textParts.join("\n").trim() || "(no reply)",
        product: input.product,
        sessionId: input.sessionId,
        draft,
        data: lastData,
      };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const use of toolUses) {
      const timestamp = new Date().toISOString();
      logger.logToolCall({
        name: use.name,
        input: use.input,
        userId: input.userId,
        timestamp,
      });

      const def = getToolByName(input.product, use.name);
      let result: unknown;

      if (!def) {
        result = { error: `Unknown tool for ${input.product}: ${use.name}` };
      } else {
        try {
          result = await def.execute(
            (use.input ?? {}) as Record<string, unknown>,
            toolCtx,
          );
        } catch (err) {
          result = {
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }

      lastData = result;
      const maybeDraft = extractDraft(result);
      if (maybeDraft) {
        draft = { ...maybeDraft, tool: use.name };
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return {
    reply: "Stopped after max tool iterations. Please try a simpler request.",
    product: input.product,
    sessionId: input.sessionId,
    draft,
    data: lastData,
  };
}
