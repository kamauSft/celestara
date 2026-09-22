/**
 * Integration entry — registerAgent(mount, deps) and handleAgentMessage(input, ctx).
 * Imports nothing from outside /agent. HTTP routes under /agent/*.
 */

import type {
  AgentDeps,
  AgentHttpRequest,
  AgentHttpResponse,
  AgentRequest,
  AgentResponse,
  MountHandler,
  Product,
} from "./contract.js";
import { runAgentLoop } from "./core/loop.js";
import { createAgentLogger } from "./core/logger.js";
import { getTools } from "./core/registry.js";

export type {
  AgentDeps,
  AgentRequest,
  AgentResponse,
  AgentLogger,
  ConfirmActionPort,
  Listing,
  MountHandler,
  Product,
  RecordSalePort,
  Sale,
  SearchListingsPort,
} from "./contract.js";

export { createStubAdapters } from "./adapters/stub.js";
export { createRealAdapters } from "./adapters/real.js";
export { getTools } from "./core/registry.js";
export { SOURCE_URL, getFactSheet } from "./knowledge.js";

function isProduct(v: unknown): v is Product {
  return v === "neo" || v === "nyumba";
}

function parseAgentRequest(body: unknown): AgentRequest | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "JSON body required" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.message !== "string" || !b.message.trim()) {
    return { error: "message (string) is required" };
  }
  if (!isProduct(b.product)) {
    return { error: 'product must be "neo" or "nyumba"' };
  }
  if (typeof b.userId !== "string" || !b.userId.trim()) {
    return { error: "userId (string) is required" };
  }
  if (typeof b.sessionId !== "string" || !b.sessionId.trim()) {
    return { error: "sessionId (string) is required" };
  }
  return {
    message: b.message.trim(),
    product: b.product,
    userId: b.userId.trim(),
    sessionId: b.sessionId.trim(),
  };
}

/**
 * Core message handler — usable without HTTP.
 */
export async function handleAgentMessage(
  input: AgentRequest,
  deps: AgentDeps,
): Promise<AgentResponse> {
  const resolved: AgentDeps = {
    ...deps,
    logger: deps.logger ?? createAgentLogger(),
  };
  return runAgentLoop(input, resolved);
}

/**
 * Register HTTP routes on a host mount function.
 * Paths: POST /agent/message, GET /agent/health, GET /agent/tools?product=
 *
 * Example (Express-like):
 *   registerAgent((path, method, handler) => {
 *     app[method.toLowerCase()](path, async (req, res) => {
 *       const out = await handler({ body: req.body, query: req.query });
 *       res.status(out.status).json(out.body);
 *     });
 *   }, deps);
 */
export function registerAgent(mount: MountHandler, deps: AgentDeps): void {
  mount("/agent/health", "GET", () => ({
    status: 200,
    body: {
      ok: true,
      module: "codzure-agent",
      products: ["neo", "nyumba"],
      demoMode: Boolean(deps.demoMode),
    },
  }));

  mount("/agent/tools", "GET", (req: AgentHttpRequest): AgentHttpResponse => {
    const product = req.query?.product;
    if (!isProduct(product)) {
      return {
        status: 400,
        body: { error: 'query product must be "neo" or "nyumba"' },
      };
    }
    const tools = getTools(product).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
    return { status: 200, body: { product, tools } };
  });

  mount("/agent/message", "POST", async (req: AgentHttpRequest) => {
    const parsed = parseAgentRequest(req.body);
    if ("error" in parsed) {
      return { status: 400, body: { error: parsed.error } };
    }
    try {
      const response = await handleAgentMessage(parsed, deps);
      return { status: 200, body: response };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 500, body: { error: message } };
    }
  });
}

/** Convenience: Neo-only alias */
export async function handleNeoMessage(
  message: string,
  userId: string,
  sessionId: string,
  deps: AgentDeps,
): Promise<AgentResponse> {
  return handleAgentMessage(
    { message, product: "neo", userId, sessionId },
    deps,
  );
}

/** Convenience: Nyumba-only alias */
export async function handleNyumbaMessage(
  message: string,
  userId: string,
  sessionId: string,
  deps: AgentDeps,
): Promise<AgentResponse> {
  return handleAgentMessage(
    { message, product: "nyumba", userId, sessionId },
    deps,
  );
}
