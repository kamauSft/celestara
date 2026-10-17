import { getDb } from "../db";
import { maskPhone } from "../auth/phone";
import {
  contributionCell,
  openingPeriod,
  periodLabel,
  periodsBetween,
  roleLabel,
  type ContributionCell,
} from "../chama/picture";
import { formatKes, installmentRemaining, periodOf } from "../finance";
import { parseChamaSettings } from "../chama/rules";
import { assertCanReadMembership, TenantIsolationError } from "../tenancy/context";

export async function loadMemberFile(membershipId: string, asOf: Date) {
  assertCanReadMembership(membershipId);
  const db = getDb();
  const membership = await db.membership.findFirst({
    where: { id: membershipId },
    include: {
      person: true,
      chama: true,
      contributions: { orderBy: { datePaid: "asc" } },
      fines: { orderBy: { date: "asc" } },
      loans: { include: { installments: { orderBy: { dueDate: "asc" } } } },
    },
  });
  if (!membership) throw new TenantIsolationError("Membership is not in this chama");

  const settings = parseChamaSettings(membership.chama.settings);
  const period = periodOf(asOf);
  const periods = periodsBetween(openingPeriod(membership.joinDate, settings.contributionDueDay), period);
  const cells = periods.map((cellPeriod) =>
    contributionCell({
      period: cellPeriod,
      dueDay: settings.contributionDueDay,
      monthlyCents: settings.monthlyContributionCents,
      joinDate: membership.joinDate,
      exitDate: membership.exitDate,
      payments: membership.contributions
        .filter((row) => row.period === cellPeriod)
        .map((row) => ({ amountCents: row.amountCents, date: row.datePaid })),
      asOf,
    }),
  );

  return {
    chamaName: membership.chama.name,
    personName: membership.person.name,
    memberNo: membership.memberNo,
    role: roleLabel(membership.role),
    phoneMasked: maskPhone(membership.person.phone),
    status: membership.status === "ACTIVE" ? "Active" : membership.status === "EXITED" ? "Exited" : "Suspended",
    period,
    periodLabel: periodLabel(period),
    periods: periods.map(periodLabel),
    cells,
    thisMonth: (cells.at(-1) ?? "NOT_DUE") as ContributionCell,
    monthlyDueLabel: formatKes(settings.monthlyContributionCents),
    fines: membership.fines.map((fine) => ({
      date: fine.date.toISOString().slice(0, 10),
      type: fine.type.replaceAll("_", " ").toLowerCase(),
      amountLabel: formatKes(fine.amountCents),
      status: fine.status,
    })),
    loans: membership.loans.map((loan) => ({
      purpose: loan.purpose,
      status: loan.status,
      principalLabel: formatKes(loan.principalCents),
      installments: loan.installments.map((installment) => ({
        dueDate: installment.dueDate.toISOString().slice(0, 10),
        dueLabel: formatKes(installment.principalDueCents + installment.interestDueCents),
        paidLabel: formatKes(installment.paidAmountCents),
        remainingLabel: formatKes(installmentRemaining(installment)),
        status: installment.status,
      })),
    })),
  };
}
