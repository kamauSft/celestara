export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/** KES 100,000,000. Rejects amounts that cannot be a real chama transaction. */
export const MAX_CENTS = 10_000_000_000;

export function assertCents(
  value: number,
  label: string,
  options?: { allowNegative?: boolean; max?: number },
): void {
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isSafeInteger(value)) {
    throw new MoneyError(`${label} must be a safe integer number of cents`);
  }
  if (!options?.allowNegative && value < 0) {
    throw new MoneyError(`${label} cannot be negative`);
  }
  const max = options?.max ?? MAX_CENTS;
  if (Math.abs(value) > max) {
    throw new MoneyError(`${label} exceeds the allowed amount`);
  }
}

/** Integer division, half away from zero. */
export function divRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new MoneyError("cannot divide by zero");
  }
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const quotient = n / d;
  const remainder = n % d;
  const rounded = remainder * 2n >= d ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

export function formatKes(cents: number): string {
  assertCents(cents, "amount", { allowNegative: true });
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const major = Math.floor(abs / 100);
  const minor = (abs % 100).toString().padStart(2, "0");
  const grouped = major.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}KES ${grouped}.${minor}`;
}
