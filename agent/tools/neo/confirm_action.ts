/**
 * Neo tool: confirm_action — execute a previously drafted write by id.
 */

import type { AgentToolDefinition } from "../../contract.js";

export const confirmActionTool: AgentToolDefinition = {
  name: "confirm_action",
  description:
    "Confirm and execute a previously drafted Neo write action by draftId (e.g. after record_sale).",
  inputSchema: {
    type: "object",
    properties: {
      draftId: {
        type: "string",
        description: "The draft id returned by record_sale",
      },
    },
    required: ["draftId"],
  },
  async execute(input, ctx) {
    const draftId = String(input.draftId ?? "");
    if (!draftId) return { error: "draftId is required" };

    const result = await ctx.deps.confirmAction.confirm(draftId);
    if (!result.ok) {
      return { confirmed: false, draftId, error: result.error };
    }
    return { confirmed: true, draftId, result: result.result };
  },
};
