import {
  compareDateOnly,
  dueDateForPeriod,
  periodOf,
  shiftPeriod,
} from "../finance";

export type ContributionCell = "PAID" | "LATE" | "MISSED" | "NOT_DUE";
export type PlanName = "FREE" | "STANDARD" | "PRO";

export function openingPeriod(joinDate: Date, dueDay: number): string {
  let period = periodOf(joinDate);
  if (compareDateOnly(joinDate, dueDateForPeriod(period, dueDay)) > 0) {
    period = shiftPeriod(period, 1);
  }
  return period;
}

export function contributionCell(input: {
  period: string;
  dueDay: number;
  monthlyCents: number;
  joinDate: Date;
  exitDate: Date | null;
  payments: { amountCents: number; date: Date }[];
  asOf: Date;
}): ContributionCell {
  const due = dueDateForPeriod(input.period, input.dueDay);
  const opens = dueDateForPeriod(openingPeriod(input.joinDate, input.dueDay), input.dueDay);
  if (compareDateOnly(due, opens) < 0) return "NOT_DUE";
  if (input.exitDate && compareDateOnly(input.exitDate, due) < 0) return "NOT_DUE";

  const paid = input.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  if (paid >= input.monthlyCents) {
    const settledLate = input.payments.some(
      (payment) => payment.amountCents > 0 && compareDateOnly(payment.date, due) > 0,
    );
    return settledLate ? "LATE" : "PAID";
  }
  if (compareDateOnly(due, input.asOf) > 0) return "NOT_DUE";
  return "MISSED";
}

export function periodsBetween(start: string, end: string): string[] {
  if (start > end) return [];
  const periods: string[] = [];
  let cursor = start;
  while (cursor <= end && periods.length < 48) {
    periods.push(cursor);
    cursor = shiftPeriod(cursor, 1);
  }
  return periods;
}

/** Free is zero. Standard is the higher of KES 500 and KES 30 an active member. Pro doubles that floor and that rate. */
export function monthlyPriceCents(plan: PlanName, activeMembers: number): number {
  if (!Number.isInteger(activeMembers) || activeMembers < 0) {
    throw new Error("active members must be a non-negative integer");
  }
  if (plan === "FREE") return 0;
  if (plan === "STANDARD") return Math.max(50_000, activeMembers * 3_000);
  if (plan === "PRO") return Math.max(100_000, activeMembers * 6_000);
  throw new Error("unknown plan");
}

/** Each installment is collected interest-first, matching the lending pool. */
export function interestCollectedCents(
  installments: { interestDueCents: number; paidAmountCents: number }[],
): number {
  return installments.reduce((sum, row) => {
    const interest = Math.max(row.interestDueCents, 0);
    const paid = Math.max(row.paidAmountCents, 0);
    return sum + Math.min(interest, paid);
  }, 0);
}

export function formatRateBps(bps: number): string {
  const tenths = Math.round(bps / 10);
  const whole = Math.trunc(tenths / 10);
  const fraction = Math.abs(tenths % 10);
  return `${whole}.${fraction}%`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function periodLabel(period: string): string {
  const month = Number(period.slice(5, 7));
  const name = MONTHS[month - 1] ?? period;
  return `${name} ${period.slice(0, 4)}`;
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    CHAIR: "Chair",
    TREASURER: "Treasurer",
    SECRETARY: "Secretary",
    AUDITOR: "Auditor",
    MEMBER: "Member",
  };
  return labels[role] ?? role;
}
