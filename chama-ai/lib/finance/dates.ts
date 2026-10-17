import { MoneyError } from "./money";

export function dateOnly(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new MoneyError("invalid date");
  }
  return date.toISOString().slice(0, 10);
}

export function parseDateOnly(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new MoneyError("invalid date");
  }
  const [year, month, day] = iso.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new MoneyError("invalid date");
  }
  return parsed;
}

export function periodOf(date: Date): string {
  return dateOnly(date).slice(0, 7);
}

export function assertPeriod(period: string): { year: number; month: number } {
  if (!/^\d{4}-\d{2}$/.test(period)) {
    throw new MoneyError("invalid period");
  }
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));
  if (month < 1 || month > 12) {
    throw new MoneyError("invalid period");
  }
  return { year, month };
}

/** Contribution due dates are capped at the 28th so every month has the day. */
export function dueDateForPeriod(period: string, dueDay: number): Date {
  const { year, month } = assertPeriod(period);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
    throw new MoneyError("due day must be between 1 and 28");
  }
  return new Date(Date.UTC(year, month - 1, dueDay));
}

export function compareDateOnly(a: Date, b: Date): number {
  const left = dateOnly(a);
  const right = dateOnly(b);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function addMonthsClamped(date: Date, months: number): Date {
  if (!Number.isInteger(months)) {
    throw new MoneyError("months must be an integer");
  }
  const day = date.getUTCDate();
  const cursor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), Math.min(day, lastDay)));
}

export function shiftPeriod(period: string, delta: number): string {
  return periodOf(addMonthsClamped(dueDateForPeriod(period, 1), delta));
}

export function compareDateThenId(a: { date: Date; id: string }, b: { date: Date; id: string }): number {
  const byDate = compareDateOnly(a.date, b.date);
  if (byDate !== 0) return byDate;
  if (a.id < b.id) return -1;
  return 1;
}
