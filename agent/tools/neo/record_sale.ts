/**
 * Neo tool: record_sale — parse structured sale fields and DRAFT only.
 * Never writes; returns requiresConfirmation + summary.
 */

import type { AgentToolDefinition } from "../../contract.js";

export const recordSaleTool: AgentToolDefinition = {
  name: "record_sale",
  description:
    "Draft a Neo sales record from structured fields (item, quantity, customer, amount). Does NOT write — returns a draft requiring confirmation.",
  inputSchema: {
    type: "object",
    properties: {
      item: { type: "string", description: "What was sold, e.g. bags cement" },
      quantity: { type: "number", description: "How many units sold" },
      customer: { type: "string", description: "Buyer name" },
      amount: { type: "number", description: "Total amount (numeric)" },
      currency: {
        type: "string",
        description: "Currency code, default KES",
      },
    },
    required: ["item", "quantity", "customer", "amount"],
  },
  async execute(input, ctx) {
    const item = String(input.item ?? "");
    const quantity = Number(input.quantity);
    const customer = String(input.customer ?? "");
    const amount = Number(input.amount);
    const currency =
      input.currency != null ? String(input.currency) : undefined;

    if (!item || !customer || !Number.isFinite(quantity) || !Number.isFinite(amount)) {
      return {
        error: "item, quantity, customer, and amount are required numbers/strings",
      };
    }

    const draft = await ctx.deps.recordSale.draftSale({
      item,
      quantity,
      customer,
      amount,
      currency,
      userId: ctx.userId,
    });

    return {
      requiresConfirmation: true as const,
      draftId: draft.draftId,
      summary: draft.summary,
      hint: "Ask the user to confirm, then call confirm_action with this draftId.",
    };
  },
};
