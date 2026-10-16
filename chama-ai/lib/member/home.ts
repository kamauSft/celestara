import { auditIsIntact } from "../audit/intact";
import { parseChamaSettings } from "../chama/rules";
import { getDb } from "../db";
import {
  arrears,
  finesDue,
  formatKes,
  loanBalance,
  memberNetPosition,
  memberSavings,
  overdueInstallments,
} from "../finance";
import { assertCanReadMembership, TenantIsolationError } from "../tenancy/context";

export async function loadMemberHome(membershipId: string, asOf = new Date()) {
  assertCanReadMembership(membershipId);
  const db = getDb();
  const membership = await db.membership.findFirst({
    where: { id: membershipId },
    include: { person: true, chama: true },
  });
  if (!membership) throw new TenantIsolationError("Membership is not in this chama");

  const [contributions, fines, loans, goals, auditIntact] = await Promise.all([
    db.contribution.findMany({ where: { membershipId } }),
    db.fine.findMany({ where: { membershipId } }),
    db.loan.findMany({ where: { membershipId }, include: { installments: true } }),
    db.savingsGoal.findMany({ where: { membershipId } }),
    auditIsIntact(),
  ]);

  const settings = parseChamaSettings(membership.chama.settings);
  const openLoans = loans.filter((loan) => ["DISBURSED", "ACTIVE", "DEFAULTED"].includes(loan.status));
  const installments = openLoans.flatMap((loan) => loan.installments);
  const savingsCents = memberSavings(contributions);
  const loanBalanceCents = loanBalance(installments);
  const finesCents = finesDue(fines);
  const position = memberNetPosition({ savingsCents, loanBalanceCents, finesCents });
  const arrearsReport = arrears({
    monthlyContributionCents: settings.monthlyContributionCents,
    contributionDueDay: settings.contributionDueDay,
    joinDate: membership.joinDate,
    exitDate: membership.exitDate,
    contributions: contributions.map((contribution) => ({
      period: contribution.period,
      amountCents: contribution.amountCents,
    })),
    asOf,
  });
  const lateInstallments = overdueInstallments(installments, asOf);

  return {
    chamaName: membership.chama.name,
    county: membership.chama.county,
    personName: membership.person.name,
    role: membership.role,
    memberNo: membership.memberNo,
    status: membership.status,
    position,
    savingsLabel: formatKes(position.savingsCents),
    loanLabel: formatKes(position.loanBalanceCents),
    finesLabel: formatKes(position.finesCents),
    netLabel: formatKes(position.netCents),
    arrearsCents: arrearsReport.totalOutstandingCents,
    arrearsLabel: formatKes(arrearsReport.totalOutstandingCents),
    overdueInstallmentCents: lateInstallments.reduce((sum, row) => sum + row.remainingCents, 0),
    auditIntact,
    goals: goals.map((goal) => ({
      title: goal.title,
      targetLabel: formatKes(goal.targetCents),
      savedLabel: formatKes(savingsCents),
      progressBps: goal.targetCents === 0 ? 10_000 : Math.min(10_000, Math.round((savingsCents * 10_000) / goal.targetCents)),
    })),
  };
}
