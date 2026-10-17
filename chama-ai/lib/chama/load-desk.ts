import { auditIsIntact } from "../audit/intact";
import { maskPhone } from "../auth/phone";
import { getDb } from "../db";
import {
  arrears,
  finesDue,
  formatKes,
  groupSummary,
  lendingPool,
  loanBalance,
  outstandingPrincipalCents,
  overdueInstallments,
  periodOf,
} from "../finance";
import { assertOfficial } from "../tenancy/context";
import { parseChamaSettings } from "./rules";
import {
  contributionCell,
  formatRateBps,
  interestCollectedCents,
  monthlyPriceCents,
  periodsBetween,
  periodLabel,
  roleLabel,
  type ContributionCell,
} from "./picture";

export interface DeskView {
  chamaName: string;
  county: string;
  asOf: string;
  auditIntact: boolean;
  activeMembers: number;
  poolLabel: string;
  reserveLabel: string;
  loansOutstandingLabel: string;
  collectionRateLabel: string;
  collectionRateBps: number;
  expectedLabel: string;
  collectedLabel: string;
  period: string;
  periodLabel: string;
  mpesaNeedsReview: number;
  monthTally: Record<ContributionCell, number>;
  receipts: { transId: string; amountLabel: string; phoneMasked: string; billRef: string }[];
  behind: {
    membershipId: string;
    memberNo: string;
    name: string;
    arrearsLabel: string;
    finesLabel: string;
    overdueLoanLabel: string;
    thisMonth: ContributionCell;
  }[];
  members: {
    membershipId: string;
    memberNo: string;
    name: string;
    role: string;
    status: string;
    savingsLabel: string;
    loanLabel: string;
    finesLabel: string;
    arrearsLabel: string;
    phoneMasked: string;
    thisMonth: ContributionCell;
  }[];
  periods: string[];
  grid: { membershipId: string; memberNo: string; name: string; cells: ContributionCell[] }[];
  loans: {
    memberNo: string;
    name: string;
    purpose: string;
    status: string;
    principalLabel: string;
    balanceLabel: string;
    months: number;
  }[];
  value: ValueStory;
}

export interface ValueStory {
  minutesSaved: number;
  latestPeriod: string;
  onTimeLabel: string;
  beforeLabel: string;
  remindersSent: number;
  questionsAnswered: number;
  paymentsRecorded: number;
  statementsIssued: number;
  arrearsRecoveredLabel: string;
  standardLabel: string;
  proLabel: string;
  standardCents: number;
  proCents: number;
  activeMembers: number;
}

export async function loadDesk(asOf: Date): Promise<DeskView> {
  assertOfficial();
  const db = getDb();
  const chama = await db.chama.findFirst();
  if (!chama) throw new Error("Chama is missing");
  const settings = parseChamaSettings(chama.settings);

  const [memberships, expenses, welfare, metrics, receipts, auditIntact] = await Promise.all([
    db.membership.findMany({
      include: {
        person: true,
        contributions: true,
        fines: true,
        loans: { include: { installments: true } },
      },
      orderBy: { memberNo: "asc" },
    }),
    db.expense.findMany(),
    db.welfareClaim.findMany(),
    db.valueMetric.findMany({ orderBy: { period: "asc" } }),
    db.mpesaTransaction.findMany({ where: { status: "NEEDS_REVIEW" }, orderBy: { createdAt: "asc" } }),
    auditIsIntact(),
  ]);
  const mpesaNeedsReview = receipts.length;

  const period = periodOf(asOf);
  const start = memberships.reduce((earliest, membership) => {
    const joined = periodOf(membership.joinDate);
    return joined < earliest ? joined : earliest;
  }, period);
  const periods = periodsBetween(start, period);

  const installments = memberships.flatMap((membership) =>
    membership.loans.flatMap((loan) => loan.installments),
  );
  const contributionCents = memberships.reduce(
    (sum, membership) =>
      sum + membership.contributions.reduce((inner, row) => inner + row.amountCents, 0),
    0,
  );
  const interestEarnedCents = interestCollectedCents(installments);
  const finesCollectedCents = memberships.reduce(
    (sum, membership) =>
      sum +
      membership.fines
        .filter((fine) => fine.status === "PAID")
        .reduce((inner, fine) => inner + fine.amountCents, 0),
    0,
  );
  const loansOutstandingCents = outstandingPrincipalCents(installments);
  const expenseCents = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  const welfarePayoutCents = welfare
    .filter((claim) => claim.status === "PAID")
    .reduce((sum, claim) => sum + claim.amountCents, 0);
  const pool = lendingPool({
    contributionCents,
    interestEarnedCents,
    finesCollectedCents,
    loansOutstandingCents,
    expenseCents,
    welfarePayoutCents,
    reserveBps: settings.reserveBps,
  });

  const monthContributions = memberships.flatMap((membership) =>
    membership.contributions
      .filter((row) => row.period === period)
      .map((row) => ({ period: row.period, amountCents: row.amountCents })),
  );
  const openLoans = memberships.flatMap((membership) =>
    membership.loans.filter((loan) => ["DISBURSED", "ACTIVE", "DEFAULTED"].includes(loan.status)),
  );

  const rows = memberships.map((membership) => {
    const paymentsByPeriod = new Map<string, { amountCents: number; date: Date }[]>();
    for (const contribution of membership.contributions) {
      const list = paymentsByPeriod.get(contribution.period) ?? [];
      list.push({ amountCents: contribution.amountCents, date: contribution.datePaid });
      paymentsByPeriod.set(contribution.period, list);
    }
    const cells = periods.map((cellPeriod) =>
      contributionCell({
        period: cellPeriod,
        dueDay: settings.contributionDueDay,
        monthlyCents: settings.monthlyContributionCents,
        joinDate: membership.joinDate,
        exitDate: membership.exitDate,
        payments: paymentsByPeriod.get(cellPeriod) ?? [],
        asOf,
      }),
    );
    const arrearsReport = arrears({
      monthlyContributionCents: settings.monthlyContributionCents,
      contributionDueDay: settings.contributionDueDay,
      joinDate: membership.joinDate,
      exitDate: membership.exitDate,
      contributions: membership.contributions.map((row) => ({
        period: row.period,
        amountCents: row.amountCents,
      })),
      asOf,
    });
    const savingsCents = membership.contributions.reduce((sum, row) => sum + row.amountCents, 0);
    const loanBalanceCents = loanBalance(
      membership.loans
        .filter((loan) => ["DISBURSED", "ACTIVE", "DEFAULTED"].includes(loan.status))
        .flatMap((loan) => loan.installments),
    );
    const finesCents = finesDue(membership.fines);
    const overdueLoanCents = overdueInstallments(
      membership.loans.flatMap((loan) => loan.installments),
      asOf,
    ).reduce((sum, row) => sum + row.remainingCents, 0);
    return {
      membershipId: membership.id,
      memberNo: membership.memberNo,
      name: membership.person.name,
      role: membership.role,
      status: membership.status,
      phoneMasked: maskPhone(membership.person.phone),
      cells,
      savingsCents,
      loanBalanceCents,
      finesCents,
      arrearsCents: arrearsReport.totalOutstandingCents,
      overdueLoanCents,
    };
  });

  const expectedMembers = rows.filter((row) => row.cells[row.cells.length - 1] !== "NOT_DUE").length;
  const summary = groupSummary({
    period,
    activeMembers: rows.filter((row) => row.status === "ACTIVE").length,
    expectedContributionCents: expectedMembers * settings.monthlyContributionCents,
    contributions: monthContributions,
    interestEarned: [],
    finesCollected: [],
    loansDisbursed: [],
    expenses: [],
    welfare: [],
    loansOutstandingCents,
    activeLoanCount: openLoans.length,
  });

  const activeMembers = rows.filter((row) => row.status === "ACTIVE").length;
  const latest = metrics[metrics.length - 1];
  const standardCents = monthlyPriceCents("STANDARD", activeMembers);
  const proCents = monthlyPriceCents("PRO", activeMembers);
  const value: ValueStory = {
    minutesSaved: metrics.reduce((sum, metric) => sum + metric.minutesSaved, 0),
    latestPeriod: latest?.period ?? period,
    onTimeLabel: formatRateBps(latest?.onTimeRateBps ?? 0),
    beforeLabel: formatRateBps(latest?.onTimeRateBeforeBps ?? 0),
    remindersSent: metrics.reduce((sum, metric) => sum + metric.remindersSent, 0),
    questionsAnswered: metrics.reduce((sum, metric) => sum + metric.questionsAnswered, 0),
    paymentsRecorded: metrics.reduce((sum, metric) => sum + metric.paymentsRecorded, 0),
    statementsIssued: metrics.reduce((sum, metric) => sum + metric.statementsIssued, 0),
    arrearsRecoveredLabel: formatKes(metrics.reduce((sum, metric) => sum + metric.arrearsRecoveredCents, 0)),
    standardLabel: formatKes(standardCents),
    proLabel: formatKes(proCents),
    standardCents,
    proCents,
    activeMembers,
  };

  const behind = rows
    .filter((row) => row.arrearsCents > 0 || row.finesCents > 0 || row.overdueLoanCents > 0)
    .sort((a, b) => b.arrearsCents + b.finesCents + b.overdueLoanCents - (a.arrearsCents + a.finesCents + a.overdueLoanCents));

  return {
    chamaName: chama.name,
    county: chama.county ?? "",
    asOf: asOf.toISOString().slice(0, 10),
    auditIntact,
    activeMembers,
    poolLabel: formatKes(pool.poolCents),
    reserveLabel: formatKes(pool.reserveCents),
    loansOutstandingLabel: formatKes(loansOutstandingCents),
    collectionRateLabel: formatRateBps(summary.collectionRateBps),
    collectionRateBps: summary.collectionRateBps,
    expectedLabel: formatKes(summary.expectedContributionCents),
    collectedLabel: formatKes(summary.contributionCents),
    period,
    periodLabel: periodLabel(period),
    mpesaNeedsReview,
    monthTally: {
      PAID: rows.filter((row) => row.cells.at(-1) === "PAID").length,
      LATE: rows.filter((row) => row.cells.at(-1) === "LATE").length,
      MISSED: rows.filter((row) => row.cells.at(-1) === "MISSED").length,
      NOT_DUE: rows.filter((row) => row.cells.at(-1) === "NOT_DUE").length,
    },
    receipts: receipts.map((receipt) => ({
      transId: receipt.transId,
      amountLabel: formatKes(receipt.amountCents),
      phoneMasked: maskPhone(receipt.phone ?? ""),
      billRef: receipt.billRef || "No account number",
    })),
    behind: behind.map((row) => ({
      membershipId: row.membershipId,
      memberNo: row.memberNo,
      name: row.name,
      arrearsLabel: formatKes(row.arrearsCents),
      finesLabel: formatKes(row.finesCents),
      overdueLoanLabel: formatKes(row.overdueLoanCents),
      thisMonth: row.cells.at(-1) ?? "NOT_DUE",
    })),
    members: rows.map((row) => ({
      membershipId: row.membershipId,
      memberNo: row.memberNo,
      name: row.name,
      role: roleLabel(row.role),
      status: row.status === "ACTIVE" ? "Active" : row.status === "EXITED" ? "Exited" : "Suspended",
      savingsLabel: formatKes(row.savingsCents),
      loanLabel: formatKes(row.loanBalanceCents),
      finesLabel: formatKes(row.finesCents),
      arrearsLabel: formatKes(row.arrearsCents),
      phoneMasked: row.phoneMasked,
      thisMonth: row.cells.at(-1) ?? "NOT_DUE",
    })),
    periods,
    grid: rows.map((row) => ({
      membershipId: row.membershipId,
      memberNo: row.memberNo,
      name: row.name,
      cells: row.cells,
    })),
    loans: memberships
      .flatMap((membership) =>
        membership.loans.map((loan) => ({
          memberNo: membership.memberNo,
          name: membership.person.name,
          purpose: loan.purpose,
          status: loan.status,
          principalLabel: formatKes(loan.principalCents),
          balanceLabel: formatKes(loanBalance(loan.installments)),
          months: loan.months,
          rank: loanRank(loan.status),
        })),
      )
      .sort((a, b) => a.rank - b.rank || a.memberNo.localeCompare(b.memberNo))
      .map(({ rank: _rank, ...loan }) => loan),
    value,
  };
}

function loanRank(status: string): number {
  const order = ["APPLIED", "UNDER_REVIEW", "APPROVED", "DISBURSED", "ACTIVE", "DEFAULTED", "PAID", "REJECTED"];
  const index = order.indexOf(status);
  return index === -1 ? order.length : index;
}

/** Group value only. A member can read this; it does not include anyone else's balance. */
export async function loadValueStory(asOf: Date): Promise<ValueStory & { chamaName: string; period: string }> {
  const db = getDb();
  const chama = await db.chama.findFirst();
  if (!chama) throw new Error("Chama is missing");
  const [activeMembers, metrics] = await Promise.all([
    db.membership.count({ where: { status: "ACTIVE" } }),
    db.valueMetric.findMany({ orderBy: { period: "asc" } }),
  ]);
  const period = periodOf(asOf);
  const latest = metrics[metrics.length - 1];
  const standardCents = monthlyPriceCents("STANDARD", activeMembers);
  const proCents = monthlyPriceCents("PRO", activeMembers);
  return {
    chamaName: chama.name,
    period,
    minutesSaved: metrics.reduce((sum, metric) => sum + metric.minutesSaved, 0),
    latestPeriod: latest?.period ?? period,
    onTimeLabel: formatRateBps(latest?.onTimeRateBps ?? 0),
    beforeLabel: formatRateBps(latest?.onTimeRateBeforeBps ?? 0),
    remindersSent: metrics.reduce((sum, metric) => sum + metric.remindersSent, 0),
    questionsAnswered: metrics.reduce((sum, metric) => sum + metric.questionsAnswered, 0),
    paymentsRecorded: metrics.reduce((sum, metric) => sum + metric.paymentsRecorded, 0),
    statementsIssued: metrics.reduce((sum, metric) => sum + metric.statementsIssued, 0),
    arrearsRecoveredLabel: formatKes(metrics.reduce((sum, metric) => sum + metric.arrearsRecoveredCents, 0)),
    standardLabel: formatKes(standardCents),
    proLabel: formatKes(proCents),
    standardCents,
    proCents,
    activeMembers,
  };
}
