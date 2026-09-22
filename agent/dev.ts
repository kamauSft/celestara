/**
 * Standalone dev runner — StubAdapters by default.
 * Run from /agent: npm start  (or npm run agent:dev)
 *
 * Env: AGENT_ANTHROPIC_API_KEY, AGENT_PORT (default 8787)
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createStubAdapters } from "./adapters/stub.js";
import type { AgentDeps, AgentHttpRequest, AgentHttpResponse } from "./contract.js";
import { registerAgent } from "./index.js";

function readEnv(name: string): string | undefined {
  return process.env[name];
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function send(res: ServerResponse, out: AgentHttpResponse): void {
  const payload = JSON.stringify(out.body);
  res.writeHead(out.status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(payload);
}

async function main(): Promise<void> {
  const demoMode =
    readEnv("AGENT_DEMO_MODE") === "1" ||
    readEnv("AGENT_DEMO_MODE")?.toLowerCase() === "true";
  const apiKey = readEnv("AGENT_ANTHROPIC_API_KEY") ?? "";

  if (!demoMode && !apiKey) {
    console.error(
      "Missing AGENT_ANTHROPIC_API_KEY (or set AGENT_DEMO_MODE=1 for free offline demo).",
    );
    process.exit(1);
  }

  const port = Number(readEnv("AGENT_PORT") ?? "8787");
  const stubs = createStubAdapters();
  const deps: AgentDeps = {
    ...stubs,
    anthropicApiKey: apiKey || "demo-offline",
    demoMode,
  };

  type Route = {
    method: "GET" | "POST";
    handler: (
      req: AgentHttpRequest,
    ) => Promise<AgentHttpResponse> | AgentHttpResponse;
  };
  const routes = new Map<string, Route>();

  registerAgent((path, method, handler) => {
    routes.set(`${method} ${path}`, { method, handler });
  }, deps);

  const server = createServer(async (req, res) => {
    const method = (req.method ?? "GET").toUpperCase();
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      });
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    const key = `${method} ${url.pathname}`;
    const route = routes.get(key);

    if (!route) {
      send(res, {
        status: 404,
        body: {
          error: "Not found",
          hint: "POST /agent/message | GET /agent/health | GET /agent/tools?product=neo",
        },
      });
      return;
    }

    try {
      const query: Record<string, string | undefined> = {};
      url.searchParams.forEach((v, k) => {
        query[k] = v;
      });
      const body =
        method === "POST" || method === "PUT" ? await readBody(req) : undefined;
      const out = await route.handler({ body, query, headers: {} });
      send(res, out);
    } catch (err) {
      send(res, {
        status: 500,
        body: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  });

  server.listen(port, () => {
    console.log(`[agent] listening on http://127.0.0.1:${port}`);
    console.log("[agent] StubAdapters active (in-memory Neo sales + Nyumba listings)");
    if (demoMode) {
      console.log("[agent] DEMO MODE on — free offline tool routing (no Anthropic credits)");
    }
    console.log("[agent] POST /agent/message  GET /agent/health  GET /agent/tools?product=");
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
