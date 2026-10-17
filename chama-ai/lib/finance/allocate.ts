import { compareDateOnly, compareDateThenId, periodOf } from "./dates";
import { MoneyError, assertCents } from "./money";
import { installmentRemaining, type DatedInstallment } from "./loans";
import type { FineStatus } from "./types";

export type AllocationBucket =
  | "OVERDUE_FINE"
  | "OVERDUE_LOAN"
  | "CURRENT_CONTRIBUTION"
  | "ADVANCE_CONTRIBUTION";

export interface AllocationLine {
  bucket: AllocationBucket;
  targetId: string;
  amountCents: number;
}

export interface AllocatableFine {
  id: string;
  amountCents: number;
  status: FineStatus;
  date: Date;
}

export interface AllocatablePeriod {
  period: string;
  expectedCents: number;
  paidCents: number;
}

/**
 * Allocation order: overdue fines, loan installments that are due, earliest
 * unpaid contribution periods through the current month, then advance months.
 */
export function allocatePayment(input: {
  amountCents: number;
  asOf: Date;
  fines: AllocatableFine[];
  installments: DatedInstallment[];
  periods: AllocatablePeriod[];
}): { lines: AllocationLine[]; unallocatedCents: number } {
  assertCents(input.amountCents, "payment");
  if (input.amountCents === 0) {
    throw new MoneyError("payment must be positive");
  }

  let remaining = input.amountCents;
  const lines: AllocationLine[] = [];
  const take = (bucket: AllocationBucket, targetId: string, capacity: number) => {
    if (remaining === 0 || capacity <= 0) return;
    const amount = Math.min(remaining, capacity);
    lines.push({ bucket, targetId, amountCents: amount });
    remaining -= amount;
  };

  const fines = [...input.fines].sort(compareDateThenId);
  for (const fine of fines) {
    assertCents(fine.amountCents, "fine");
    if (fine.status === "PAID" || fine.status === "WAIVED") continue;
    if (fine.status !== "UNPAID") throw new MoneyError("unknown fine status");
    take("OVERDUE_FINE", fine.id, fine.amountCents);
  }

  const installments = [...input.installments].sort((a, b) =>
    compareDateThenId({ id: a.id, date: a.dueDate }, { id: b.id, date: b.dueDate }),
  );
  for (const installment of installments) {
    if (compareDateOnly(installment.dueDate, input.asOf) > 0) continue;
    take("OVERDUE_LOAN", installment.id, installmentRemaining(installment));
  }

  const currentPeriod = periodOf(input.asOf);
  const periods = [...input.periods].sort((a, b) => (a.period < b.period ? -1 : 1));
  for (const period of periods) {
    assertCents(period.expectedCents, "expected contribution");
    assertCents(period.paidCents, "paid contribution");
    const outstanding = period.expectedCents - period.paidCents;
    if (period.period <= currentPeriod) {
      take("CURRENT_CONTRIBUTION", period.period, outstanding);
    } else {
      take("ADVANCE_CONTRIBUTION", period.period, outstanding);
    }
  }

  return { lines, unallocatedCents: remaining };
}
