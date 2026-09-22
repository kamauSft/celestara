/**
 * Standalone dev runner — StubAdapters by default.
 * Free weak-local LLM by default (AGENT_DEMO_MODE=1). Optional Anthropic / OpenAI-compatible.
 */

import { createReadStream, existsSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createStubAdapters } from "./adapters/stub.js";
import type { AgentDeps, AgentHttpRequest, AgentHttpResponse } from "./contract.js";
import { registerAgent } from "./index.js";

const AGENT_ROOT = fileURLToPath(new URL(".", import.meta.url));

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
  const type = out.contentType ?? "application/json; charset=utf-8";
  const payload =
    typeof out.body === "string" && type.includes("text/html")
      ? out.body
      : JSON.stringify(out.body);
  res.writeHead(out.status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(payload);
}

function mimeFor(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function tryServeAsset(pathname: string, res: ServerResponse): boolean {
  if (!pathname.startsWith("/agent/assets/")) return false;
  const rel = pathname.slice("/agent/assets/".length);
  if (!rel || rel.includes("..") || rel.includes("/") || rel.includes("\\")) {
    res.writeHead(400).end("bad path");
    return true;
  }
  const filePath = normalize(join(AGENT_ROOT, "assets", rel));
  if (!filePath.startsWith(join(AGENT_ROOT, "assets")) || !existsSync(filePath)) {
    res.writeHead(404).end("not found");
    return true;
  }
  res.writeHead(200, {
    "Content-Type": mimeFor(filePath),
    "Cache-Control": "public, max-age=3600",
    "Access-Control-Allow-Origin": "*",
  });
  createReadStream(filePath).pipe(res);
  return true;
}

async function main(): Promise<void> {
  const demoMode =
    readEnv("AGENT_DEMO_MODE") === "1" ||
    readEnv("AGENT_DEMO_MODE")?.toLowerCase() === "true" ||
    readEnv("AGENT_LLM_PROVIDER") === "local" ||
    !readEnv("AGENT_LLM_PROVIDER");
  const apiKey = readEnv("AGENT_ANTHROPIC_API_KEY") ?? "";
  const llmProviderEnv = readEnv("AGENT_LLM_PROVIDER") as
    | AgentDeps["llmProvider"]
    | undefined;

  const llmProvider: AgentDeps["llmProvider"] =
    llmProviderEnv ??
    (readEnv("AGENT_LLM_BASE_URL")
      ? "openai-compatible"
      : demoMode
        ? "local"
        : "anthropic");

  if (llmProvider === "anthropic" && !apiKey) {
    console.error(
      "Missing AGENT_ANTHROPIC_API_KEY (or set AGENT_DEMO_MODE=1 / AGENT_LLM_PROVIDER=local).",
    );
    process.exit(1);
  }

  const port = Number(readEnv("AGENT_PORT") ?? "8787");
  const stubs = createStubAdapters();
  const deps: AgentDeps = {
    ...stubs,
    anthropicApiKey: apiKey || "demo-offline",
    demoMode: llmProvider === "local",
    llmProvider,
    llmBaseUrl: readEnv("AGENT_LLM_BASE_URL"),
    llmApiKey: readEnv("AGENT_LLM_API_KEY") ?? readEnv("GROQ_API_KEY"),
    llmModel: readEnv("AGENT_LLM_MODEL"),
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
    if (method === "GET" && tryServeAsset(url.pathname, res)) return;

    const key = `${method} ${url.pathname}`;
    const route = routes.get(key);

    if (!route) {
      send(res, {
        status: 404,
        body: {
          error: "Not found",
          hint: "Open /agent for chat | POST /agent/message | GET /agent/health",
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
    console.log("[agent] StubAdapters active · chat UI at /agent");
    console.log(`[agent] LLM provider: ${llmProvider}`);
    console.log("[agent] POST /agent/message  GET /agent/health  GET /agent/tools?product=");
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
