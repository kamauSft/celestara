import { describe, expect, it } from "vitest";
import { monthlyPriceCents, contributionCell, interestCollectedCents, formatRateBps, periodsBetween } from "@/lib/chama/picture";
import { assertOfficial, runWithTenant, TenantIsolationError } from "@/lib/tenancy/context";

const dueDay = 5;
const monthly = 200_000;
const asOf = new Date("2026-10-16T00:00:00.000Z");
const join = new Date("2025-05-01T00:00:00.000Z");

describe("contribution cells", () => {
  it("marks an on-time payment, a late payment, a miss, and a month that is not owed", () => {
    expect(
      contributionCell({
        period: "2026-10",
        dueDay,
        monthlyCents: monthly,
        joinDate: join,
        exitDate: null,
        payments: [{ amountCents: monthly, date: new Date("2026-10-03T00:00:00.000Z") }],
        asOf,
      }),
    ).toBe("PAID");
    expect(
      contributionCell({
        period: "2026-08",
        dueDay,
        monthlyCents: monthly,
        joinDate: join,
        exitDate: null,
        payments: [{ amountCents: monthly, date: new Date("2026-08-16T00:00:00.000Z") }],
        asOf,
      }),
    ).toBe("LATE");
    expect(
      contributionCell({
        period: "2026-10",
        dueDay,
        monthlyCents: monthly,
        joinDate: join,
        exitDate: null,
        payments: [],
        asOf,
      }),
    ).toBe("MISSED");
    expect(
      contributionCell({
        period: "2026-04",
        dueDay,
        monthlyCents: monthly,
        joinDate: join,
        exitDate: new Date("2026-03-18T00:00:00.000Z"),
        payments: [],
        asOf,
      }),
    ).toBe("NOT_DUE");
    expect(
      contributionCell({
        period: "2025-12",
        dueDay,
        monthlyCents: monthly,
        joinDate: new Date("2026-01-03T00:00:00.000Z"),
        exitDate: null,
        payments: [],
        asOf,
      }),
    ).toBe("NOT_DUE");
    expect(
      contributionCell({
        period: "2026-11",
        dueDay,
        monthlyCents: monthly,
        joinDate: join,
        exitDate: null,
        payments: [],
        asOf,
      }),
    ).toBe("NOT_DUE");
  });
});

describe("pricing", () => {
  it("uses the floor until the per-member rate overtakes it", () => {
    expect(monthlyPriceCents("FREE", 40)).toBe(0);
    expect(monthlyPriceCents("STANDARD", 10)).toBe(50_000);
    expect(monthlyPriceCents("STANDARD", 19)).toBe(57_000);
    expect(monthlyPriceCents("PRO", 10)).toBe(100_000);
    expect(monthlyPriceCents("PRO", 19)).toBe(114_000);
    expect(formatRateBps(9140)).toBe("91.4%");
    expect(formatRateBps(7100)).toBe("71.0%");
    expect(interestCollectedCents([{ interestDueCents: 2_000, paidAmountCents: 5_000 }])).toBe(2_000);
    expect(interestCollectedCents([{ interestDueCents: 2_000, paidAmountCents: 1_000 }])).toBe(1_000);
    expect(periodsBetween("2026-03", "2026-01")).toEqual([]);
    expect(() => monthlyPriceCents("STANDARD", -1)).toThrow(/active members/);
  });
});

describe("official gate", () => {
  it("lets officials open the desk and refuses a member", () => {
    expect(() => runWithTenant({ role: "TREASURER", chamaId: "c" }, () => assertOfficial())).not.toThrow();
    expect(() => runWithTenant({ role: "MEMBER", chamaId: "c" }, () => assertOfficial())).toThrow(TenantIsolationError);
  });
});
