import { describe, expect, it } from "vitest";
import { GENESIS_HASH, auditHash, canonicalJson, verifyAuditChain, type AuditBody } from "@/lib/audit/chain";

const body = (seq: number, after: unknown): AuditBody => ({
  chamaId: "chama",
  seq,
  actorMembershipId: null,
  actorPersonId: null,
  source: "SYSTEM",
  action: "NOTE",
  entityType: "Chama",
  entityId: "chama",
  before: null,
  after,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("audit chain", () => {
  it("canonicalises objects and rejects a broken sequence", () => {
    expect(canonicalJson({ b: 1, a: [true, undefined] })).toBe('{"a":[true,null],"b":1}');
    expect(canonicalJson("ok")).toBe('"ok"');
    const first = body(1, { name: "Umoja" });
    const firstHash = auditHash(GENESIS_HASH, first);
    const second = body(2, { name: "Umoja" });
    const entries = [
      { prevHash: firstHash, hash: auditHash(firstHash, second), body: second },
      { prevHash: GENESIS_HASH, hash: firstHash, body: first },
    ];
    expect(verifyAuditChain(entries).ok).toBe(true);
    expect(verifyAuditChain([]).ok).toBe(true);
    expect(verifyAuditChain([{ ...entries[1], prevHash: "ffff" }]).ok).toBe(false);
    expect(verifyAuditChain([{ ...entries[1], body: body(2, { name: "Umoja" }) }]).brokenAtSeq).toBe(2);
  });
});
