import { createHash } from "node:crypto";

export const GENESIS_HASH = "0".repeat(64);

export interface AuditBody {
  chamaId: string;
  seq: number;
  actorMembershipId: string | null;
  actorPersonId: string | null;
  source: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

export function auditHash(prevHash: string, body: AuditBody): string {
  return createHash("sha256").update(`${prevHash}\n${canonicalJson(body)}`).digest("hex");
}

export function verifyAuditChain(entries: { prevHash: string; hash: string; body: AuditBody }[]): {
  ok: boolean;
  brokenAtSeq?: number;
} {
  const ordered = [...entries].sort((a, b) => a.body.seq - b.body.seq);
  let previous = GENESIS_HASH;
  for (let index = 0; index < ordered.length; index += 1) {
    const entry = ordered[index];
    if (entry.body.seq !== index + 1 || entry.prevHash !== previous) {
      return { ok: false, brokenAtSeq: entry.body.seq };
    }
    if (auditHash(previous, entry.body) !== entry.hash) {
      return { ok: false, brokenAtSeq: entry.body.seq };
    }
    previous = entry.hash;
  }
  return { ok: true };
}
