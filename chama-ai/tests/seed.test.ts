import { beforeAll, describe, expect, it } from "vitest";
import { loanApprovalsSatisfied } from "@/lib/approvals/maker-checker";
import { verifyAuditChain } from "@/lib/audit/chain";
import { loginWithPin } from "@/lib/auth/service";
import { umojaSettings } from "@/lib/chama/rules";
import { prismaRaw } from "@/lib/db";
import { loadDesk } from "@/lib/chama/load-desk";
import { loadMemberHome } from "@/lib/member/home";
import { loadStatement } from "@/lib/member/statement";
import { runWithTenant, TenantIsolationError } from "@/lib/tenancy/context";
import { DEMO_PIN, SEED_AS_OF, loans, members, mpesaQueue, savingsCentsAt } from "../prisma/seed-data";
import { seedDatabase } from "../prisma/seed";
import { resetDatabase } from "./db";

beforeAll(async () => {
  await resetDatabase();
  await seedDatabase();
}, 60_000);

describe("Umoja seed", () => {
  it("keeps historical loans inside the chama rules", () => {
    expect(members).toHaveLength(20);
    expect(loans).toHaveLength(15);
    expect(members.filter((member) => member.exitDate).map((member) => member.memberNo)).toEqual(["M015"]);
    expect(members.filter((member) => member.joinDate > "2025-12-31")).toHaveLength(1);
    for (const loan of loans) {
      const on = loan.issueDate ?? loan.applicationDate;
      const savings = savingsCentsAt(loan.memberNo, on);
      const cap = savings * umojaSettings.maxLoanSavingsMultiple;
      if (!loan.issueDate) {
        expect(loan.principalCents).toBeGreaterThan(cap);
        continue;
      }
      expect(loan.principalCents).toBeLessThanOrEqual(cap);
      if (loan.principalCents > savings) {
        const covered = (loan.guarantors ?? []).reduce((sum, row) => sum + row.amountCents, 0);
        expect(covered).toBeGreaterThanOrEqual(loan.principalCents - savings);
      }
    }
    const treasurerLoan = loans.find((loan) => loan.memberNo === "M002");
    expect(
      loanApprovalsSatisfied({
        amountCents: treasurerLoan?.principalCents ?? 0,
        limitCents: umojaSettings.treasurerApprovalLimitCents,
        requesterMembershipId: "M002",
        borrowerMembershipId: "M002",
        borrowerIsTreasurer: true,
        approvals: [
          { membershipId: "M001", role: "CHAIR" },
          { membershipId: "M003", role: "SECRETARY" },
        ],
      }).ok,
    ).toBe(true);
  });

  it("loads a member's own position and refuses another member's records", async () => {
    expect(await prismaRaw.membership.count()).toBe(20);
    expect(await prismaRaw.loan.count()).toBe(15);
    expect(await prismaRaw.mpesaTransaction.count({ where: { status: "NEEDS_REVIEW" } })).toBe(mpesaQueue.length);
    expect(await prismaRaw.meeting.count()).toBe(18);
    expect(await prismaRaw.poll.count()).toBe(2);
    expect(await prismaRaw.welfareClaim.count()).toBe(2);

    const amina = await prismaRaw.membership.findFirst({
      where: { memberNo: "M005" },
      include: { person: true, chama: true },
    });
    const grace = await prismaRaw.membership.findFirst({ where: { memberNo: "M001" } });
    if (!amina || !grace) throw new Error("seed members missing");

    const home = await runWithTenant(
      {
        chamaId: amina.chamaId,
        membershipId: amina.id,
        personId: amina.personId,
        role: "MEMBER",
      },
      () => loadMemberHome(amina.id, new Date(`${SEED_AS_OF}T00:00:00.000Z`)),
    );
    expect(home.personName).toBe("Amina Hassan Bakari");
    expect(home.position.savingsCents).toBe(savingsCentsAt("M005", SEED_AS_OF));
    expect(home.auditIntact).toBe(true);
    expect(home.goals[0]?.title).toBe("Plot deposit");

    await expect(
      runWithTenant({ chamaId: amina.chamaId, membershipId: amina.id, role: "MEMBER" }, () =>
        loadMemberHome(grace.id, new Date(`${SEED_AS_OF}T00:00:00.000Z`)),
      ),
    ).rejects.toBeInstanceOf(TenantIsolationError);

    const chairView = await runWithTenant(
      { chamaId: amina.chamaId, membershipId: grace.id, role: "CHAIR" },
      () => loadMemberHome(amina.id, new Date(`${SEED_AS_OF}T00:00:00.000Z`)),
    );
    expect(chairView.memberNo).toBe("M005");

    const logs = await prismaRaw.auditLog.findMany();
    expect(
      verifyAuditChain(
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
          },
        })),
      ).ok,
    ).toBe(true);

    const signedIn = await loginWithPin({
      phone: amina.person.phone,
      pin: DEMO_PIN,
      now: new Date(`${SEED_AS_OF}T12:00:00.000Z`),
    });
    expect(signedIn.status).toBe("authenticated");
  });

  it("opens the treasurer desk and keeps a member out of other people's books", async () => {
    const treasurer = await prismaRaw.membership.findFirst({ where: { memberNo: "M002" }, include: { person: true } });
    const amina = await prismaRaw.membership.findFirst({ where: { memberNo: "M005" } });
    if (!treasurer || !amina) throw new Error("seed members missing");
    const asOf = new Date(`${SEED_AS_OF}T00:00:00.000Z`);

    const desk = await runWithTenant(
      { chamaId: treasurer.chamaId, membershipId: treasurer.id, personId: treasurer.personId, role: "TREASURER" },
      () => loadDesk(asOf),
    );
    expect(desk.activeMembers).toBe(19);
    expect(desk.collectionRateBps).toBe(8421);
    expect(desk.behind.map((row) => row.memberNo).sort()).toEqual(["M006", "M009", "M014"]);
    expect(desk.value.proCents).toBe(114_000);
    expect(desk.value.onTimeLabel).toBe("91.4%");
    expect(desk.mpesaNeedsReview).toBe(3);
    expect(desk.auditIntact).toBe(true);
    const aminaRow = desk.grid.find((row) => row.memberNo === "M005");
    const jamesRow = desk.grid.find((row) => row.memberNo === "M006");
    expect(aminaRow?.cells.at(-1)).toBe("PAID");
    expect(jamesRow?.cells.at(-1)).toBe("MISSED");
    expect(desk.monthTally.MISSED).toBe(3);
    expect(desk.members.find((row) => row.memberNo === "M006")?.thisMonth).toBe("MISSED");
    expect(desk.receipts).toHaveLength(3);
    expect(desk.loans.filter((loan) => loan.status === "ACTIVE")).toHaveLength(4);
    expect(desk.loans.filter((loan) => loan.status === "DEFAULTED")).toHaveLength(1);

    await expect(
      runWithTenant({ chamaId: amina.chamaId, membershipId: amina.id, role: "MEMBER" }, () => loadDesk(asOf)),
    ).rejects.toBeInstanceOf(TenantIsolationError);

    const own = await runWithTenant(
      { chamaId: amina.chamaId, membershipId: amina.id, role: "MEMBER" },
      () => loadStatement(amina.id),
    );
    expect(own.personName).toBe("Amina Hassan Bakari");
    expect(own.lines.some((line) => line.description.includes("2026-10"))).toBe(true);
    await expect(
      runWithTenant({ chamaId: amina.chamaId, membershipId: amina.id, role: "MEMBER" }, () =>
        loadStatement(treasurer.id),
      ),
    ).rejects.toBeInstanceOf(TenantIsolationError);
  });
});
