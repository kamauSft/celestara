/**
 * contract.ts — dependency-free merge point for the agentic module.
 * Host apps may import types/ports from here without pulling in Anthropic or HTTP.
 */

export type Product = "neo" | "nyumba";

/** Neo SME sale record */
export interface Sale {
  id: string;
  item: string;
  quantity: number;
  customer: string;
  amount: number;
  currency: string;
  createdAt: string;
  userId: string;
}

/** Nyumba Zetu property / land listing */
export interface Listing {
  id: string;
  title: string;
  location: string;
  bedrooms?: number;
  price: number;
  currency: string;
  nearby?: string[];
  type: "apartment" | "house" | "land" | "commercial";
  description?: string;
}

export interface AgentRequest {
  message: string;
  product: Product;
  userId: string;
  sessionId: string;
}

export interface AgentResponse {
  reply: string;
  product: Product;
  sessionId: string;
  /** Present when a write tool drafted an action awaiting confirmation */
  draft?: DraftActionSummary;
  /** Optional structured payload (e.g. search hits) */
  data?: unknown;
}

export interface DraftActionSummary {
  id: string;
  tool: string;
  summary: string;
  requiresConfirmation: true;
}

/** Full draft stored by adapters (not always returned to clients) */
export interface DraftAction {
  id: string;
  tool: string;
  summary: string;
  payload: unknown;
  requiresConfirmation: true;
  createdAt: string;
  userId: string;
  product: Product;
  status: "pending" | "confirmed" | "cancelled";
}

export interface DraftSaleInput {
  item: string;
  quantity: number;
  customer: string;
  amount: number;
  currency?: string;
  userId: string;
}

export interface DraftSaleResult {
  requiresConfirmation: true;
  draftId: string;
  summary: string;
}

export interface SearchListingsQuery {
  location: string;
  bedrooms?: number;
  maxPrice?: number;
  nearby?: string;
}

export interface ConfirmResult {
  ok: true;
  result: unknown;
}

export interface ConfirmError {
  ok: false;
  error: string;
}

/** Port: draft + list Neo sales (writes only via confirm) */
export interface RecordSalePort {
  draftSale(input: DraftSaleInput): Promise<DraftSaleResult>;
  listSales(userId?: string): Promise<Sale[]>;
}

/** Port: search Nyumba listings (read-only, immediate) */
export interface SearchListingsPort {
  search(query: SearchListingsQuery): Promise<Listing[]>;
}

/** Port: confirm or inspect drafted write actions by id */
export interface ConfirmActionPort {
  getDraft(draftId: string): Promise<DraftAction | null>;
  confirm(draftId: string): Promise<ConfirmResult | ConfirmError>;
}

export interface AgentLogger {
  logToolCall(entry: {
    name: string;
    input: unknown;
    userId: string;
    timestamp: string;
  }): void;
}

/** Dependencies injected into registerAgent / handleAgentMessage */
export interface AgentDeps {
  recordSale: RecordSalePort;
  searchListings: SearchListingsPort;
  confirmAction: ConfirmActionPort;
  anthropicApiKey: string;
  /** Model id; defaults to claude-sonnet-4-20250514 */
  model?: string;
  logger?: AgentLogger;
  /**
   * Free offline / weak-local demo: skip paid Anthropic.
   * Use when AGENT_DEMO_MODE=1 or llmProvider is "local".
   */
  demoMode?: boolean;
  /** anthropic | local | openai-compatible */
  llmProvider?: "anthropic" | "local" | "openai-compatible";
  /** OpenAI-compatible base URL, e.g. https://api.groq.com/openai/v1 */
  llmBaseUrl?: string;
  llmApiKey?: string;
  llmModel?: string;
}

export type MountHandler = (
  path: string,
  method: "GET" | "POST",
  handler: (req: AgentHttpRequest) => Promise<AgentHttpResponse> | AgentHttpResponse,
) => void;

export interface AgentHttpRequest {
  body?: unknown;
  query?: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
}

export interface AgentHttpResponse {
  status: number;
  body: unknown;
  /** Defaults to application/json */
  contentType?: string;
}

export interface AgentToolContext {
  deps: AgentDeps;
  userId: string;
  sessionId: string;
  product: Product;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (
    input: Record<string, unknown>,
    ctx: AgentToolContext,
  ) => Promise<unknown>;
}
