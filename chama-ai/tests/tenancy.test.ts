import { afterEach, describe, expect, it } from "vitest";
import { getDb, prismaRaw } from "@/lib/db";
import { appendAuditLog } from "@/lib/audit/log";
import { verifyAuditChain } from "@/lib/audit/chain";
import { runWithTenant, TenantIsolationError } from "@/lib/tenancy/context";
import { ImmutabilityError } from "@/lib/tenancy/models";
import { umojaSettings } from "@/lib/chama/rules";
import { resetDatabase } from "./db";

async function twoChamas() {
  const alpha = await prismaRaw.chama.create({
    data: { name: "Alpha", settings: umojaSettings, plan: "FREE", status: "ACTIVE" },
  });
  const beta = await prismaRaw.chama.create({
    data: { name: "Beta", settings: umojaSettings, plan: "FREE", status: "ACTIVE" },
  });
  const person = await prismaRaw.person.create({
    data: { name: "Amina", phone: "+254712000099", channelPrefs: {}, consent: {} },
  });
  const membership = await prismaRaw.membership.create({
    data: {
      chamaId: alpha.id,
      personId: person.id,
      role: "MEMBER",
      memberNo: "M001",
      joinDate: new Date("2026-01-01T00:00:00.000Z"),
      hashedPin: "test",
    },
  });
  const contribution = await prismaRaw.contribution.create({
    data: {
      chamaId: alpha.id,
      membershipId: membership.id,
      amountCents: 200_000,
      period: "2026-01",
      datePaid: new Date("2026-01-03T00:00:00.000Z"),
      method: "CASH",
      source: "MANUAL",
    },
  });
  await prismaRaw.invoice.create({
    data: { chamaId: alpha.id, period: "2026-01", amountCents: 500_00, status: "due" },
  });
  return { alpha, beta, person, membership, contribution };
}

afterEach(async () => {
  await resetDatabase();
});

describe("tenant isolation", () => {
  it("hides another chama and blocks financial edits", async () => {
    const { alpha, beta, contribution, membership } = await twoChamas();
    await expect(getDb().contribution.findMany()).rejects.toBeInstanceOf(TenantIsolationError);

    const visible = await runWithTenant({ chamaId: alpha.id, role: "TREASURER", membershipId: membership.id }, () =>
      getDb().contribution.findMany(),
    );
    expect(visible).toHaveLength(1);

    const hidden = await runWithTenant({ chamaId: beta.id, role: "TREASURER" }, () =>
      getDb().contribution.findMany(),
    );
    expect(hidden).toHaveLength(0);
    await expect(
      runWithTenant({ chamaId: beta.id, role: "TREASURER" }, () =>
        getDb().contribution.update({ where: { id: contribution.id }, data: { amountCents: 1 } }),
      ),
    ).rejects.toBeInstanceOf(TenantIsolationError);

    await expect(
      runWithTenant({ chamaId: alpha.id, role: "TREASURER" }, () =>
        getDb().contribution.update({ where: { id: contribution.id }, data: { amountCents: 1 } }),
      ),
    ).rejects.toBeInstanceOf(ImmutabilityError);
    await expect(
      runWithTenant({ chamaId: alpha.id, role: "TREASURER" }, () =>
        getDb().contribution.delete({ where: { id: contribution.id } }),
      ),
    ).rejects.toBeInstanceOf(ImmutabilityError);
    await expect(getDb().session.findMany()).rejects.toBeInstanceOf(TenantIsolationError);
    await expect(
      runWithTenant({ chamaId: alpha.id, role: "MEMBER" }, () => getDb().person.findMany()),
    ).rejects.toBeInstanceOf(TenantIsolationError);
  });

  it("keeps a super admin out of the books unless support access is open", async () => {
    const { alpha } = await twoChamas();
    await expect(
      runWithTenant({ isSuperAdmin: true }, () => getDb().contribution.findMany()),
    ).rejects.toBeInstanceOf(TenantIsolationError);

    const invoices = await runWithTenant({ isSuperAdmin: true }, () => getDb().invoice.findMany());
    expect(invoices).toHaveLength(1);
    const chamas = await runWithTenant({ isSuperAdmin: true }, () => getDb().chama.findMany());
    expect(chamas.map((chama) => chama.name).sort()).toEqual(["Alpha", "Beta"]);

    const supported = await runWithTenant(
      { isSuperAdmin: true, supportAccess: true, chamaId: alpha.id },
      () => getDb().contribution.findMany(),
    );
    expect(supported).toHaveLength(1);
  });

  it("writes a hash-chained audit log that detects tampering", async () => {
    const { alpha, membership, person } = await twoChamas();
    await runWithTenant(
      { chamaId: alpha.id, membershipId: membership.id, personId: person.id, role: "TREASURER" },
      async () => {
        await appendAuditLog({
          action: "ONE",
          entityType: "Chama",
          entityId: alpha.id,
          after: { ok: true },
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        });
        await appendAuditLog({
          action: "TWO",
          entityType: "Chama",
          entityId: alpha.id,
          before: { count: 1 },
          after: { count: 2 },
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
        });
      },
    );
    const rows = await prismaRaw.auditLog.findMany({ orderBy: { seq: "asc" } });
    const chain = rows.map((row) => ({
      prevHash: row.prevHash,
      hash: row.hash,
      body: {
        chamaId: row.chamaId,
        seq: row.seq,
        actorMembershipId: row.actorMembershipId,
        actorPersonId: row.actorPersonId,
        source: row.source,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        before: row.before ?? null,
        after: row.after ?? null,
        createdAt: row.createdAt.toISOString(),
      },
    }));
    expect(verifyAuditChain(chain).ok).toBe(true);
    chain[1].body.after = { count: 9 };
    expect(verifyAuditChain(chain).ok).toBe(false);
    await expect(appendAuditLog({ action: "NO", entityType: "Chama", entityId: "x" })).rejects.toBeInstanceOf(
      TenantIsolationError,
    );
  });
});
