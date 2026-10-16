import { MoneyError, assertCents, divRound } from "./money";
import type { MembershipStanding } from "./types";

export interface RepaymentHistory {
  contributionsExpected: number;
  contributionsOnTime: number;
  installmentsDue: number;
  installmentsOnTime: number;
}

function assertCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new MoneyError(`${label} must be a non-negative integer`);
  }
}

function rateBps(onTime: number, total: number): bigint {
  return divRound(BigInt(onTime) * 10_000n, BigInt(total));
}

/** 0–100. A member with no history scores 50. */
export function repaymentScore(history: RepaymentHistory): number {
  assertCount(history.contributionsExpected, "contributions expected");
  assertCount(history.contributionsOnTime, "contributions on time");
  assertCount(history.installmentsDue, "installments due");
  assertCount(history.installmentsOnTime, "installments on time");
  if (history.contributionsOnTime > history.contributionsExpected) {
    throw new MoneyError("on-time contributions cannot exceed contributions expected");
  }
  if (history.installmentsOnTime > history.installmentsDue) {
    throw new MoneyError("on-time installments cannot exceed installments due");
  }

  if (history.contributionsExpected === 0 && history.installmentsDue === 0) return 50;
  if (history.installmentsDue === 0) {
    return Number(divRound(rateBps(history.contributionsOnTime, history.contributionsExpected), 100n));
  }
  if (history.contributionsExpected === 0) {
    return Number(divRound(rateBps(history.installmentsOnTime, history.installmentsDue), 100n));
  }
  return Number(
    divRound(
      rateBps(history.contributionsOnTime, history.contributionsExpected) * 70n +
        rateBps(history.installmentsOnTime, history.installmentsDue) * 30n,
      10_000n,
    ),
  );
}

export interface LoanEligibilityInput extends RepaymentHistory {
  standing: MembershipStanding;
  requestedAmountCents: number;
  requestedMonths: number;
  minMonths: number;
  maxMonths: number;
  savingsCents: number;
  savingsMultiple: number;
  outstandingBalanceCents: number;
  hasActiveLoan: boolean;
  lendingPoolCents: number;
}

export interface LoanEligibilityResult {
  eligible: boolean;
  maxAmountCents: number;
  reasons: string[];
  guarantorsNeededCents: number;
  repaymentScore: number;
}

export function loanEligibility(input: LoanEligibilityInput): LoanEligibilityResult {
  if (!Number.isInteger(input.requestedAmountCents)) {
    throw new MoneyError("requested amount must be a safe integer number of cents");
  }
  assertCents(Math.max(0, input.requestedAmountCents), "requested amount");
  assertCents(input.savingsCents, "savings");
  assertCents(input.outstandingBalanceCents, "outstanding balance");
  assertCents(input.lendingPoolCents, "lending pool");
  if (!Number.isInteger(input.savingsMultiple) || input.savingsMultiple < 1) {
    throw new MoneyError("savings multiple must be a positive integer");
  }
  if (!Number.isInteger(input.minMonths) || !Number.isInteger(input.maxMonths) || input.minMonths < 1) {
    throw new MoneyError("loan month limits are invalid");
  }
  if (!Number.isInteger(input.requestedMonths)) {
    throw new MoneyError("requested months must be an integer");
  }

  const savingsCap = Math.max(
    0,
    Number(BigInt(input.savingsCents) * BigInt(input.savingsMultiple) - BigInt(input.outstandingBalanceCents)),
  );
  const poolCap = input.lendingPoolCents;
  const maxAmountCents = Math.min(savingsCap, poolCap);
  const reasons: string[] = [];

  if (input.standing !== "ACTIVE") reasons.push("MEMBER_NOT_ACTIVE");
  if (input.hasActiveLoan) reasons.push("ACTIVE_LOAN_EXISTS");
  if (input.requestedMonths < input.minMonths || input.requestedMonths > input.maxMonths) {
    reasons.push("MONTHS_OUT_OF_RANGE");
  }
  if (input.requestedAmountCents <= 0) reasons.push("AMOUNT_NOT_POSITIVE");
  if (input.requestedAmountCents > maxAmountCents) {
    reasons.push(poolCap < savingsCap ? "POOL_EXHAUSTED" : "ABOVE_MAX");
  }

  const guarantorsNeededCents =
    input.requestedAmountCents > input.savingsCents
      ? input.requestedAmountCents - input.savingsCents
      : 0;
  if (guarantorsNeededCents > 0) {
    reasons.push("GUARANTORS_REQUIRED");
  }

  const blocking = reasons.filter((reason) => reason !== "GUARANTORS_REQUIRED");
  return {
    eligible: blocking.length === 0,
    maxAmountCents,
    reasons,
    guarantorsNeededCents,
    repaymentScore: repaymentScore(input),
  };
}
