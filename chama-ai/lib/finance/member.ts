import { compareDateOnly, dueDateForPeriod, periodOf, shiftPeriod } from "./dates";
import { MoneyError, assertCents } from "./money";
import type { FineStatus } from "./types";

export interface ContributionRecord {
  period: string;
  amountCents: number;
  date: Date;
  reference?: string;
}

export interface FineRecord {
  amountCents: number;
  status: FineStatus;
  type: string;
  date: Date;
  settledDate?: Date;
}

export interface StatementLoan {
  id: string;
  status: string;
  issueDate: Date | null;
  principalCents: number;
  installments: { principalDueCents: number; interestDueCents: number }[];
  repayments: { amountCents: number; date: Date; reference?: string }[];
}

const DISBURSED = new Set(["DISBURSED", "ACTIVE", "PAID", "DEFAULTED"]);

const KIND_ORDER = {
  LOAN_DISBURSEMENT: 0,
  LOAN_REPAYMENT: 1,
  CONTRIBUTION: 2,
  FINE_ASSESSED: 3,
  FINE_SETTLED: 4,
} as const;

type StatementKind = keyof typeof KIND_ORDER;

interface DraftEvent {
  date: Date;
  kind: StatementKind;
  description: string;
  savingsDelta: number;
  loanDelta: number;
  finesDelta: number;
}

export interface StatementLine {
  date: string;
  kind: StatementKind;
  description: string;
  savingsCents: number;
  loanBalanceCents: number;
  finesCents: number;
}

export function memberSavings(contributions: { amountCents: number }[]): number {
  return contributions.reduce((sum, contribution) => {
    assertCents(contribution.amountCents, "contribution", { allowNegative: true });
    return sum + contribution.amountCents;
  }, 0);
}

export function finesDue(fines: { amountCents: number; status: FineStatus }[]): number {
  return fines.reduce((sum, fine) => {
    assertCents(fine.amountCents, "fine");
    if (fine.status === "UNPAID") return sum + fine.amountCents;
    if (fine.status === "PAID" || fine.status === "WAIVED") return sum;
    throw new MoneyError("unknown fine status");
  }, 0);
}

export function memberNetPosition(input: {
  savingsCents: number;
  loanBalanceCents: number;
  finesCents: number;
}): { savingsCents: number; loanBalanceCents: number; finesCents: number; netCents: number } {
  assertCents(input.savingsCents, "savings", { allowNegative: true });
  assertCents(input.loanBalanceCents, "loan balance");
  assertCents(input.finesCents, "fines");
  return {
    savingsCents: input.savingsCents,
    loanBalanceCents: input.loanBalanceCents,
    finesCents: input.finesCents,
    netCents: input.savingsCents - input.loanBalanceCents - input.finesCents,
  };
}

export function arrears(input: {
  monthlyContributionCents: number;
  contributionDueDay: number;
  joinDate: Date;
  exitDate: Date | null;
  contributions: { period: string; amountCents: number }[];
  asOf: Date;
}): {
  periods: {
    period: string;
    dueDate: string;
    dueCents: number;
    paidCents: number;
    outstandingCents: number;
  }[];
  totalOutstandingCents: number;
} {
  assertCents(input.monthlyContributionCents, "monthly contribution");
  if (input.monthlyContributionCents === 0) {
    throw new MoneyError("monthly contribution must be positive");
  }
  for (const contribution of input.contributions) {
    assertCents(contribution.amountCents, "contribution", { allowNegative: true });
  }

  let period = periodOf(input.joinDate);
  if (compareDateOnly(input.joinDate, dueDateForPeriod(period, input.contributionDueDay)) > 0) {
    period = shiftPeriod(period, 1);
  }

  const periods = [];
  while (compareDateOnly(dueDateForPeriod(period, input.contributionDueDay), input.asOf) <= 0) {
    const due = dueDateForPeriod(period, input.contributionDueDay);
    const stillMember = !input.exitDate || compareDateOnly(input.exitDate, due) >= 0;
    if (stillMember) {
      const paidCents = input.contributions
        .filter((contribution) => contribution.period === period)
        .reduce((sum, contribution) => sum + contribution.amountCents, 0);
      periods.push({
        period,
        dueDate: due.toISOString().slice(0, 10),
        dueCents: input.monthlyContributionCents,
        paidCents,
        outstandingCents: Math.max(0, input.monthlyContributionCents - paidCents),
      });
    }
    period = shiftPeriod(period, 1);
  }

  return {
    periods,
    totalOutstandingCents: periods.reduce((sum, row) => sum + row.outstandingCents, 0),
  };
}

function loanObligation(loan: StatementLoan): number {
  if (loan.installments.length > 0) {
    return loan.installments.reduce(
      (sum, installment) => sum + installment.principalDueCents + installment.interestDueCents,
      0,
    );
  }
  return loan.principalCents;
}

export function memberStatement(input: {
  contributions: ContributionRecord[];
  fines: FineRecord[];
  loans: StatementLoan[];
}): StatementLine[] {
  const events: DraftEvent[] = [];

  for (const contribution of input.contributions) {
    assertCents(contribution.amountCents, "contribution", { allowNegative: true });
    events.push({
      date: contribution.date,
      kind: "CONTRIBUTION",
      description: `Contribution for ${contribution.period}`,
      savingsDelta: contribution.amountCents,
      loanDelta: 0,
      finesDelta: 0,
    });
  }

  for (const fine of input.fines) {
    assertCents(fine.amountCents, "fine");
    events.push({
      date: fine.date,
      kind: "FINE_ASSESSED",
      description: `${fine.type} fine`,
      savingsDelta: 0,
      loanDelta: 0,
      finesDelta: fine.amountCents,
    });
    if (fine.status === "UNPAID") continue;
    if (fine.status !== "PAID" && fine.status !== "WAIVED") {
      throw new MoneyError("unknown fine status");
    }
    if (!fine.settledDate) {
      throw new MoneyError("settled fine is missing a date");
    }
    events.push({
      date: fine.settledDate,
      kind: "FINE_SETTLED",
      description: fine.status === "PAID" ? `${fine.type} fine paid` : `${fine.type} fine waived`,
      savingsDelta: 0,
      loanDelta: 0,
      finesDelta: -fine.amountCents,
    });
  }

  for (const loan of input.loans) {
    if (!DISBURSED.has(loan.status) || !loan.issueDate) continue;
    assertCents(loan.principalCents, "principal");
    events.push({
      date: loan.issueDate,
      kind: "LOAN_DISBURSEMENT",
      description: `Loan disbursed`,
      savingsDelta: 0,
      loanDelta: loanObligation(loan),
      finesDelta: 0,
    });
    for (const repayment of loan.repayments) {
      assertCents(repayment.amountCents, "repayment");
      events.push({
        date: repayment.date,
        kind: "LOAN_REPAYMENT",
        description: "Loan repayment",
        savingsDelta: 0,
        loanDelta: -repayment.amountCents,
        finesDelta: 0,
      });
    }
  }

  events.sort((a, b) => {
    const byDate = compareDateOnly(a.date, b.date);
    if (byDate !== 0) return byDate;
    return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  });

  let savings = 0;
  let loanBalance = 0;
  let fines = 0;
  return events.map((event) => {
    savings += event.savingsDelta;
    loanBalance = Math.max(0, loanBalance + event.loanDelta);
    fines += event.finesDelta;
    return {
      date: event.date.toISOString().slice(0, 10),
      kind: event.kind,
      description: event.description,
      savingsCents: savings,
      loanBalanceCents: loanBalance,
      finesCents: fines,
    };
  });
}
