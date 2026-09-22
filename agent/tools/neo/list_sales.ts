/**
 * Neo tool: list_sales — read recent sales immediately (no confirmation).
 */

import type { AgentToolDefinition } from "../../contract.js";

export const listSalesTool: AgentToolDefinition = {
  name: "list_sales",
  description:
    "List recent Neo sales for the current user (or all seeded demo sales). Read-only; runs immediately.",
  inputSchema: {
    type: "object",
    properties: {
      scope: {
        type: "string",
        enum: ["mine", "all"],
        description: "mine = current user only; all = all in-memory sales",
      },
    },
    required: [],
  },
  async execute(input, ctx) {
    const scope = input.scope === "all" ? "all" : "mine";
    const sales =
      scope === "all"
        ? await ctx.deps.recordSale.listSales()
        : await ctx.deps.recordSale.listSales(ctx.userId);
    return { count: sales.length, sales };
  },
};
