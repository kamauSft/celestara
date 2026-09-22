/**
 * Internal logger — lives only inside /agent.
 * Logs every tool call: name, input, userId, timestamp.
 */

import type { AgentLogger } from "../contract.js";

export function createAgentLogger(prefix = "[agent]"): AgentLogger {
  return {
    logToolCall(entry) {
      const line = JSON.stringify({
        level: "tool_call",
        name: entry.name,
        input: entry.input,
        userId: entry.userId,
        timestamp: entry.timestamp,
      });
      console.log(`${prefix} ${line}`);
    },
  };
}
