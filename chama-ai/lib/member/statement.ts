import { getDb } from "../db";
import { formatKes, memberStatement } from "../finance";
import { assertCanReadMembership, TenantIsolationError } from "../tenancy/context";

export async function loadStatement(membershipId: string) {
  assertCanReadMembership(membershipId);
  const db = getDb();
  const membership = await db.membership.findFirst({
    where: { id: membershipId },
    include: {
      person: true,
      chama: true,
      contributions: true,
      fines: true,
      loans: { include: { installments: true, repayments: true } },
    },
  });
  if (!membership) throw new TenantIsolationError("Membership is not in this chama");

  const lines = memberStatement({
    contributions: membership.contributions.map((row) => ({
      period: row.period,
      amountCents: row.amountCents,
      date: row.datePaid,
      reference: row.reference ?? undefined,
    })),
    fines: membership.fines.map((fine) => ({
      amountCents: fine.amountCents,
      status: fine.status,
      type: fine.type,
      date: fine.date,
    })),
    loans: membership.loans.map((loan) => ({
      id: loan.id,
      status: loan.status,
      issueDate: loan.issueDate,
      principalCents: loan.principalCents,
      installments: loan.installments.map((installment) => ({
        principalDueCents: installment.principalDueCents,
        interestDueCents: installment.interestDueCents,
      })),
      repayments: loan.repayments.map((repayment) => ({
        amountCents: repayment.amountCents,
        date: repayment.datePaid,
        reference: repayment.reference ?? undefined,
      })),
    })),
  });

  return {
    chamaName: membership.chama.name,
    personName: membership.person.name,
    memberNo: membership.memberNo,
    lines: lines.map((line) => ({
      date: line.date,
      description: line.description,
      savingsLabel: formatKes(line.savingsCents),
      loanLabel: formatKes(line.loanBalanceCents),
      finesLabel: formatKes(line.finesCents),
    })),
  };
}

export async function membershipIdForMemberNo(memberNo: string): Promise<string | null> {
  const row = await getDb().membership.findFirst({ where: { memberNo } });
  return row?.id ?? null;
}
