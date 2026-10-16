import { addMonthsClamped, dateOnly } from "./dates";
import { MoneyError, assertCents, divRound } from "./money";
import type { InterestType, ScheduleInstallment } from "./types";

const MAX_MONTHS = 36;
const MAX_RATE_BPS = 10_000;
const RATE_SCALE = 10_000n;

export interface LoanScheduleInput {
  principalCents: number;
  rateBps: number;
  months: number;
  type: InterestType;
  firstDueDate: Date;
}

function splitEven(total: number, months: number): number[] {
  const base = Math.floor(total / months);
  const remainder = total - base * months;
  const parts = Array.from({ length: months }, () => base);
  parts[months - 1] += remainder;
  return parts;
}

function rowsFromParts(
  principals: number[],
  interests: number[],
  firstDueDate: Date,
): ScheduleInstallment[] {
  return principals.map((principalDueCents, index) => {
    const interestDueCents = interests[index];
    return {
      sequence: index + 1,
      dueDate: dateOnly(addMonthsClamped(firstDueDate, index)),
      principalDueCents,
      interestDueCents,
      totalDueCents: principalDueCents + interestDueCents,
    };
  });
}

function flatSchedule(input: LoanScheduleInput): ScheduleInstallment[] {
  const totalInterest = Number(
    divRound(
      BigInt(input.principalCents) * BigInt(input.rateBps) * BigInt(input.months),
      RATE_SCALE,
    ),
  );
  return rowsFromParts(
    splitEven(input.principalCents, input.months),
    splitEven(totalInterest, input.months),
    input.firstDueDate,
  );
}

function reducingSchedule(input: LoanScheduleInput): ScheduleInstallment[] {
  const principal = BigInt(input.principalCents);
  const rate = BigInt(input.rateBps);
  const months = BigInt(input.months);
  const grown = (RATE_SCALE + rate) ** months;
  const emi = Number(
    divRound(principal * rate * grown, RATE_SCALE * (grown - RATE_SCALE ** months)),
  );

  let remaining = input.principalCents;
  const rows: ScheduleInstallment[] = [];
  for (let index = 0; index < input.months; index += 1) {
    const interestDueCents = Number(divRound(BigInt(remaining) * rate, RATE_SCALE));
    const principalDueCents =
      index === input.months - 1
        ? remaining
        : Math.min(remaining, Math.max(0, emi - interestDueCents));
    remaining -= principalDueCents;
    rows.push({
      sequence: index + 1,
      dueDate: dateOnly(addMonthsClamped(input.firstDueDate, index)),
      principalDueCents,
      interestDueCents,
      totalDueCents: principalDueCents + interestDueCents,
    });
  }
  return rows;
}

/** Equal monthly installments. Flat interest is principal × monthly rate × months. */
export function loanSchedule(input: LoanScheduleInput): ScheduleInstallment[] {
  assertCents(input.principalCents, "principal");
  if (input.principalCents === 0) {
    throw new MoneyError("principal must be positive");
  }
  assertCents(input.rateBps, "rate");
  if (input.rateBps > MAX_RATE_BPS) {
    throw new MoneyError("rate exceeds the allowed amount");
  }
  if (!Number.isInteger(input.months) || input.months < 1 || input.months > MAX_MONTHS) {
    throw new MoneyError("months must be between 1 and 36");
  }
  if (input.type !== "FLAT" && input.type !== "REDUCING") {
    throw new MoneyError("unknown interest type");
  }
  if (Number.isNaN(input.firstDueDate.getTime())) {
    throw new MoneyError("invalid date");
  }

  if (input.type === "FLAT" || input.rateBps === 0) {
    return flatSchedule(input);
  }
  return reducingSchedule(input);
}
