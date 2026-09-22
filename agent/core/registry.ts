/**
 * Tool registry — getTools("neo" | "nyumba") returns only that product's tools.
 */

import type { AgentToolDefinition, Product } from "../contract.js";
import { confirmActionTool } from "../tools/neo/confirm_action.js";
import { listSalesTool } from "../tools/neo/list_sales.js";
import { recordSaleTool } from "../tools/neo/record_sale.js";
import { searchListingsTool } from "../tools/nyumba/search_listings.js";

const NEO_TOOLS: AgentToolDefinition[] = [
  recordSaleTool,
  confirmActionTool,
  listSalesTool,
];

const NYUMBA_TOOLS: AgentToolDefinition[] = [searchListingsTool];

export function getTools(product: Product): AgentToolDefinition[] {
  return product === "neo" ? NEO_TOOLS : NYUMBA_TOOLS;
}

export function getToolByName(
  product: Product,
  name: string,
): AgentToolDefinition | undefined {
  return getTools(product).find((t) => t.name === name);
}
