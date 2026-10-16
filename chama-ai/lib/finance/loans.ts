import { compareDateOnly, compareDateThenId } from "./dates";
import { assertCents } from "./money";

export interface InstallmentAmounts {
  principalDueCents: number;
  interestDueCents: number;
  paidAmountCents: number;
}

export interface DatedInstallment extends InstallmentAmounts {
  id: string;
  dueDate: Date;
}

function assertInstallment(installment: InstallmentAmounts): void {
  assertCents(installment.principalDueCents, "principal due");
  assertCents(installment.interestDueCents, "interest due");
  assertCents(installment.paidAmountCents, "amount paid");
}

export function installmentRemaining(installment: InstallmentAmounts): number {
  assertInstallment(installment);
  const remaining =
    installment.principalDueCents + installment.interestDueCents - installment.paidAmountCents;
  return remaining > 0 ? remaining : 0;
}

export function loanBalance(installments: InstallmentAmounts[]): number {
  return installments.reduce((sum, installment) => sum + installmentRemaining(installment), 0);
}

/** Principal still out, assuming each installment is collected interest-first. */
export function outstandingPrincipalCents(installments: InstallmentAmounts[]): number {
  return installments.reduce((sum, installment) => {
    assertInstallment(installment);
    const interestPaid = Math.min(installment.interestDueCents, installment.paidAmountCents);
    const principalPaid = installment.paidAmountCents - interestPaid;
    const remaining = installment.principalDueCents - principalPaid;
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);
}

export function overdueInstallments(
  installments: DatedInstallment[],
  asOf: Date,
): { id: string; dueDate: string; remainingCents: number }[] {
  return installments
    .map((installment) => ({
      id: installment.id,
      dueDate: installment.dueDate,
      remainingCents: installmentRemaining(installment),
    }))
    .filter(
      (installment) =>
        installment.remainingCents > 0 && compareDateOnly(installment.dueDate, asOf) < 0,
    )
    .sort((a, b) => compareDateThenId({ date: a.dueDate, id: a.id }, { date: b.dueDate, id: b.id }))
    .map((installment) => ({
      id: installment.id,
      dueDate: installment.dueDate.toISOString().slice(0, 10),
      remainingCents: installment.remainingCents,
    }));
}
