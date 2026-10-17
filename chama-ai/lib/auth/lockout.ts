import { prismaRaw } from "../db";
import { normalizePhone } from "../phone";

/** Clears failed-PIN counters. Development and tests only. */
export async function resetLoginLockouts(phone?: string): Promise<number> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to reset lockouts in production.");
  }
  const normalized = phone ? normalizePhone(phone) : null;
  if (phone && !normalized) {
    throw new Error("That is not a Kenyan mobile number.");
  }
  const result = await prismaRaw.person.updateMany({
    where: normalized ? { phone: normalized } : {},
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
  return result.count;
}
