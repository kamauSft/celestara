import { getDb } from "../db";
import { verifyAuditChain, type AuditBody } from "./chain";

export async function auditIsIntact(): Promise<boolean> {
  const logs = await getDb().auditLog.findMany({ orderBy: { seq: "asc" } });
  return verifyAuditChain(
    logs.map((log) => ({
      prevHash: log.prevHash,
      hash: log.hash,
      body: {
        chamaId: log.chamaId,
        seq: log.seq,
        actorMembershipId: log.actorMembershipId,
        actorPersonId: log.actorPersonId,
        source: log.source,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        before: log.before ?? null,
        after: log.after ?? null,
        createdAt: log.createdAt.toISOString(),
      } satisfies AuditBody,
    })),
  ).ok;
}
