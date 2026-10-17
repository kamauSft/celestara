import { describe, expect, it } from "vitest";
import {
  MoneyError,
  addMonthsClamped,
  allocatePayment,
  arrears,
  assertCents,
  compareDateOnly,
  compareDateThenId,
  compareDividendClaim,
  dateOnly,
  divRound,
  dividendProjection,
  dueDateForPeriod,
  finesDue,
  formatKes,
  groupSummary,
  installmentRemaining,
  lendingPool,
  loanBalance,
  loanEligibility,
  loanSchedule,
  memberNetPosition,
  memberSavings,
  memberStatement,
  outstandingPrincipalCents,
  overdueInstallments,
  parseDateOnly,
  periodOf,
  reconcile,
  repaymentScore,
  shiftPeriod,
} from "@/lib/finance";

const utc = (iso: string) => parseDateOnly(iso);

describe("money", () => {
  it("rounds half away from zero and rejects a zero divisor", () => {
    expect(divRound(5n, 2n)).toBe(3n);
    expect(divRound(1n, 3n)).toBe(0n);
    expect(divRound(1n, 2n)).toBe(1n);
    expect(divRound(-5n, 2n)).toBe(-3n);
    expect(divRound(5n, -2n)).toBe(-3n);
    expect(divRound(-5n, -2n)).toBe(3n);
    expect(divRound(0n, 1n)).toBe(0n);
    expect(() => divRound(1n, 0n)).toThrow(MoneyError);
  });

  it("checks integer cents and formats shillings", () => {
    expect(assertCents(0, "amount")).toBeUndefined();
    expect(assertCents(-50, "amount", { allowNegative: true })).toBeUndefined();
    expect(() => assertCents(-1, "amount")).toThrow(/cannot be negative/);
    expect(() => assertCents(1.5, "amount")).toThrow(/integer/);
    expect(() => assertCents(Number.NaN, "amount")).toThrow(/integer/);
    expect(() => assertCents("1" as unknown as number, "amount")).toThrow(/integer/);
    expect(() => assertCents(Number.MAX_SAFE_INTEGER + 1, "amount")).toThrow(/integer/);
    expect(() => assertCents(10_000_000_001, "amount")).toThrow(/exceeds/);
    expect(() => assertCents(50, "amount", { max: 10 })).toThrow(/exceeds/);
    expect(formatKes(0)).toBe("KES 0.00");
    expect(formatKes(200_000)).toBe("KES 2,000.00");
    expect(formatKes(-150)).toBe("-KES 1.50");
    expect(() => formatKes(1.2)).toThrow(MoneyError);
  });
});

describe("dates", () => {
  it("parses calendar dates and rejects impossible ones", () => {
    expect(dateOnly(utc("2026-10-16"))).toBe("2026-10-16");
    expect(() => dateOnly(new Date(Number.NaN))).toThrow(MoneyError);
    expect(() => parseDateOnly("16-10-2026")).toThrow(MoneyError);
    expect(() => parseDateOnly("2026-02-31")).toThrow(MoneyError);
    expect(periodOf(utc("2026-01-31"))).toBe("2026-01");
    expect(dueDateForPeriod("2026-10", 5).toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(dueDateForPeriod("2026-10", 28).toISOString().slice(0, 10)).toBe("2026-10-28");
    expect(() => dueDateForPeriod("2026-13", 5)).toThrow(/period/);
    expect(() => dueDateForPeriod("202610", 5)).toThrow(/period/);
    expect(() => dueDateForPeriod("2026-10", 0)).toThrow(/due day/);
    expect(() => dueDateForPeriod("2026-10", 29)).toThrow(/due day/);
  });

  it("compares dates and clamps month ends", () => {
    expect(compareDateOnly(utc("2026-01-01"), utc("2026-02-01"))).toBe(-1);
    expect(compareDateOnly(utc("2026-02-01"), utc("2026-01-01"))).toBe(1);
    expect(compareDateOnly(utc("2026-05-05"), utc("2026-05-05"))).toBe(0);
    expect(dateOnly(addMonthsClamped(utc("2025-01-31"), 1))).toBe("2025-02-28");
    expect(dateOnly(addMonthsClamped(utc("2024-01-31"), 1))).toBe("2024-02-29");
    expect(dateOnly(addMonthsClamped(utc("2026-01-15"), 12))).toBe("2027-01-15");
    expect(() => addMonthsClamped(utc("2026-01-15"), 1.5)).toThrow(MoneyError);
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01");
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
    const earlier = { date: utc("2026-01-01"), id: "b" };
    const later = { date: utc("2026-02-01"), id: "a" };
    expect(compareDateThenId(earlier, later)).toBe(-1);
    expect(compareDateThenId(later, earlier)).toBe(1);
    expect(compareDateThenId(earlier, { ...earlier, id: "c" })).toBe(-1);
    expect(compareDateThenId({ ...earlier, id: "c" }, earlier)).toBe(1);
  });
});

describe("loanSchedule", () => {
  const firstDue = utc("2026-02-10");

  it("builds a flat schedule and puts the remainder on the last installment", () => {
    const schedule = loanSchedule({
      principalCents: 1_000_000,
      rateBps: 1_000,
      months: 3,
      type: "FLAT",
      firstDueDate: firstDue,
    });
    expect(schedule.map((row) => row.principalDueCents)).toEqual([333_333, 333_333, 333_334]);
    expect(schedule.map((row) => row.interestDueCents)).toEqual([100_000, 100_000, 100_000]);
    expect(schedule.map((row) => row.totalDueCents)).toEqual([433_333, 433_333, 433_334]);
    expect(schedule.map((row) => row.dueDate)).toEqual(["2026-02-10", "2026-03-10", "2026-04-10"]);
    expect(schedule.reduce((sum, row) => sum + row.principalDueCents, 0)).toBe(1_000_000);
    expect(schedule.reduce((sum, row) => sum + row.interestDueCents, 0)).toBe(300_000);
  });

  it("treats a zero rate as interest-free for both methods", () => {
    for (const type of ["FLAT", "REDUCING"] as const) {
      const schedule = loanSchedule({
        principalCents: 100,
        rateBps: 0,
        months: 3,
        type,
        firstDueDate: firstDue,
      });
      expect(schedule.map((row) => row.interestDueCents)).toEqual([0, 0, 0]);
      expect(schedule.map((row) => row.principalDueCents)).toEqual([33, 33, 34]);
    }
  });

  it("builds a reducing-balance schedule that repays the principal exactly", () => {
    const schedule = loanSchedule({
      principalCents: 100_000,
      rateBps: 1_000,
      months: 3,
      type: "REDUCING",
      firstDueDate: firstDue,
    });
    expect(schedule.every((row) => Number.isInteger(row.totalDueCents))).toBe(true);
    expect(schedule.reduce((sum, row) => sum + row.principalDueCents, 0)).toBe(100_000);
    expect(schedule.every((row) => row.interestDueCents > 0)).toBe(true);
    expect(schedule.at(-1)?.principalDueCents).toBeGreaterThan(0);
    const flat = loanSchedule({
      principalCents: 100_000,
      rateBps: 1_000,
      months: 3,
      type: "FLAT",
      firstDueDate: firstDue,
    });
    const reducingTotal = schedule.reduce((sum, row) => sum + row.totalDueCents, 0);
    const flatTotal = flat.reduce((sum, row) => sum + row.totalDueCents, 0);
    expect(reducingTotal).toBeLessThan(flatTotal);
  });

  it("rejects amounts, rates, months, types, and dates outside the engine limits", () => {
    const base = {
      principalCents: 100,
      rateBps: 1_000,
      months: 2,
      type: "FLAT" as const,
      firstDueDate: firstDue,
    };
    expect(() => loanSchedule({ ...base, principalCents: 0 })).toThrow(/positive/);
    expect(() => loanSchedule({ ...base, principalCents: -1 })).toThrow(MoneyError);
    expect(() => loanSchedule({ ...base, rateBps: 10_001 })).toThrow(/rate/);
    expect(() => loanSchedule({ ...base, rateBps: -1 })).toThrow(MoneyError);
    expect(() => loanSchedule({ ...base, months: 0 })).toThrow(/months/);
    expect(() => loanSchedule({ ...base, months: 37 })).toThrow(/months/);
    expect(() => loanSchedule({ ...base, months: 1.5 })).toThrow(/months/);
    expect(() => loanSchedule({ ...base, type: "DAILY" as "FLAT" })).toThrow(/interest type/);
    expect(() => loanSchedule({ ...base, firstDueDate: new Date(Number.NaN) })).toThrow(/date/);
    expect(loanSchedule({ ...base, rateBps: 10_000, months: 1 }).reduce((s, r) => s + r.interestDueCents, 0)).toBe(100);
  });
});

describe("loan balances", () => {
  const row = {
    id: "i1",
    dueDate: utc("2026-09-10"),
    principalDueCents: 800,
    interestDueCents: 200,
    paidAmountCents: 0,
  };

  it("measures remaining installment, balance, and outstanding principal", () => {
    expect(installmentRemaining(row)).toBe(1_000);
    expect(installmentRemaining({ ...row, paidAmountCents: 1_500 })).toBe(0);
    expect(loanBalance([row, { ...row, paidAmountCents: 1_000 }])).toBe(1_000);
    expect(
      outstandingPrincipalCents([
        { principalDueCents: 800, interestDueCents: 200, paidAmountCents: 100 },
        { principalDueCents: 800, interestDueCents: 200, paidAmountCents: 500 },
        { principalDueCents: 800, interestDueCents: 200, paidAmountCents: 2_000 },
      ]),
    ).toEqual(800 + 500 + 0);
  });

  it("lists installments that are late, oldest first", () => {
    const lateA = { ...row, id: "b", dueDate: utc("2026-08-10") };
    const lateB = { ...row, id: "a", dueDate: utc("2026-08-10") };
    const dueToday = { ...row, id: "c", dueDate: utc("2026-10-16") };
    const future = { ...row, id: "d", dueDate: utc("2026-11-10") };
    const paid = { ...row, id: "e", dueDate: utc("2026-07-10"), paidAmountCents: 1_000 };
    const result = overdueInstallments([future, dueToday, lateA, paid, lateB], utc("2026-10-16"));
    expect(result.map((item) => item.id)).toEqual(["a", "b"]);
    expect(result[0]).toMatchObject({ dueDate: "2026-08-10", remainingCents: 1_000 });
  });
});

describe("member position", () => {
  it("sums savings, including reversals, and unpaid fines", () => {
    expect(memberSavings([])).toBe(0);
    expect(memberSavings([{ amountCents: 200_000 }, { amountCents: -20_000 }])).toBe(180_000);
    expect(() => memberSavings([{ amountCents: 1.2 }])).toThrow(MoneyError);
    expect(
      finesDue([
        { amountCents: 20_000, status: "UNPAID" },
        { amountCents: 10_000, status: "PAID" },
        { amountCents: 5_000, status: "WAIVED" },
      ]),
    ).toBe(20_000);
    expect(() => finesDue([{ amountCents: 1, status: "VOID" as "UNPAID" }])).toThrow(/fine status/);
    expect(
      memberNetPosition({ savingsCents: 200_000, loanBalanceCents: 50_000, finesCents: 2_000 }),
    ).toEqual({
      savingsCents: 200_000,
      loanBalanceCents: 50_000,
      finesCents: 2_000,
      netCents: 148_000,
    });
    expect(() => memberNetPosition({ savingsCents: 1, loanBalanceCents: -1, finesCents: 0 })).toThrow(
      MoneyError,
    );
  });

  it("counts a month as arrears only after its due date and while the member belonged", () => {
    const base = {
      monthlyContributionCents: 200_000,
      contributionDueDay: 5,
      joinDate: utc("2026-01-03"),
      exitDate: null,
      contributions: [{ period: "2026-01", amountCents: 100_000 }],
      asOf: utc("2026-02-05"),
    };
    const open = arrears(base);
    expect(open.periods.map((period) => period.period)).toEqual(["2026-01", "2026-02"]);
    expect(open.periods[0].outstandingCents).toBe(100_000);
    expect(open.periods[1].outstandingCents).toBe(200_000);
    expect(open.totalOutstandingCents).toBe(300_000);

    expect(arrears({ ...base, asOf: utc("2026-01-04") }).periods).toEqual([]);
    expect(arrears({ ...base, asOf: utc("2026-01-05") }).periods).toHaveLength(1);

    const lateJoin = arrears({
      ...base,
      joinDate: utc("2026-01-08"),
      contributions: [],
      asOf: utc("2026-02-05"),
    });
    expect(lateJoin.periods.map((period) => period.period)).toEqual(["2026-02"]);

    const exited = arrears({
      ...base,
      exitDate: utc("2026-01-20"),
      contributions: [{ period: "2026-01", amountCents: 250_000 }],
    });
    expect(exited.periods).toHaveLength(1);
    expect(exited.periods[0].outstandingCents).toBe(0);

    const gone = arrears({
      ...base,
      joinDate: utc("2026-05-01"),
      exitDate: utc("2026-05-02"),
      asOf: utc("2026-06-10"),
      contributions: [],
    });
    expect(gone.periods).toEqual([]);
    expect(() => arrears({ ...base, monthlyContributionCents: 0 })).toThrow(/positive/);
  });

  it("builds a statement in date order with running balances", () => {
    const lines = memberStatement({
      contributions: [
        { period: "2026-01", amountCents: 200_000, date: utc("2026-01-03") },
        { period: "2026-01", amountCents: -200_000, date: utc("2026-01-03"), reference: "reversal" },
      ],
      fines: [
        { amountCents: 20_000, status: "PAID", type: "LATE_CONTRIBUTION", date: utc("2026-01-06"), settledDate: utc("2026-01-08") },
        { amountCents: 10_000, status: "WAIVED", type: "MISSED_MEETING", date: utc("2026-01-07"), settledDate: utc("2026-01-09") },
        { amountCents: 5_000, status: "UNPAID", type: "OTHER", date: utc("2026-01-10") },
      ],
      loans: [
        {
          id: "rejected",
          status: "REJECTED",
          issueDate: utc("2026-01-01"),
          principalCents: 999,
          installments: [],
          repayments: [],
        },
        {
          id: "pending",
          status: "ACTIVE",
          issueDate: null,
          principalCents: 999,
          installments: [],
          repayments: [],
        },
        {
          id: "loan",
          status: "ACTIVE",
          issueDate: utc("2026-02-01"),
          principalCents: 10_000,
          installments: [{ principalDueCents: 10_000, interestDueCents: 1_000 }],
          repayments: [{ amountCents: 20_000, date: utc("2026-03-01") }],
        },
        {
          id: "bare",
          status: "PAID",
          issueDate: utc("2026-04-01"),
          principalCents: 4_000,
          installments: [],
          repayments: [],
        },
      ],
    });

    expect(lines.map((line) => line.kind)).toEqual([
      "CONTRIBUTION",
      "CONTRIBUTION",
      "FINE_ASSESSED",
      "FINE_ASSESSED",
      "FINE_SETTLED",
      "FINE_SETTLED",
      "FINE_ASSESSED",
      "LOAN_DISBURSEMENT",
      "LOAN_REPAYMENT",
      "LOAN_DISBURSEMENT",
    ]);
    expect(lines[1].savingsCents).toBe(0);
    expect(lines.find((line) => line.kind === "FINE_SETTLED")?.description).toMatch(/paid/);
    expect(lines.filter((line) => line.kind === "FINE_SETTLED")[1].description).toMatch(/waived/);
    expect(lines.find((line) => line.date === "2026-03-01")?.loanBalanceCents).toBe(0);
    expect(lines.at(-1)?.loanBalanceCents).toBe(4_000);
    expect(lines.at(-1)?.finesCents).toBe(5_000);

    expect(() =>
      memberStatement({
        contributions: [],
        fines: [{ amountCents: 1, status: "PAID", type: "OTHER", date: utc("2026-01-01") }],
        loans: [],
      }),
    ).toThrow(/missing a date/);
    expect(() =>
      memberStatement({
        contributions: [],
        fines: [{ amountCents: 1, status: "VOID" as "UNPAID", type: "OTHER", date: utc("2026-01-01") }],
        loans: [],
      }),
    ).toThrow(/fine status/);
  });
});

describe("eligibility and repayment score", () => {
  const history = {
    contributionsExpected: 10,
    contributionsOnTime: 7,
    installmentsDue: 4,
    installmentsOnTime: 4,
  };
  const base = {
    ...history,
    standing: "ACTIVE" as const,
    requestedAmountCents: 1_500_000,
    requestedMonths: 4,
    minMonths: 1,
    maxMonths: 6,
    savingsCents: 1_000_000,
    savingsMultiple: 3,
    outstandingBalanceCents: 0,
    hasActiveLoan: false,
    lendingPoolCents: 5_000_000,
  };

  it("scores history and a clean application that still needs guarantors", () => {
    expect(repaymentScore({ contributionsExpected: 0, contributionsOnTime: 0, installmentsDue: 0, installmentsOnTime: 0 })).toBe(50);
    expect(repaymentScore({ ...history, installmentsDue: 0, installmentsOnTime: 0 })).toBe(70);
    expect(repaymentScore({ contributionsExpected: 0, contributionsOnTime: 0, installmentsDue: 2, installmentsOnTime: 1 })).toBe(50);
    expect(repaymentScore(history)).toBe(79);
    expect(() => repaymentScore({ ...history, contributionsOnTime: 11 })).toThrow(/contributions/);
    expect(() => repaymentScore({ ...history, installmentsOnTime: 5 })).toThrow(/installments/);
    expect(() => repaymentScore({ ...history, contributionsExpected: -1 })).toThrow(MoneyError);

    const result = loanEligibility(base);
    expect(result.eligible).toBe(true);
    expect(result.maxAmountCents).toBe(3_000_000);
    expect(result.guarantorsNeededCents).toBe(500_000);
    expect(result.reasons).toEqual(["GUARANTORS_REQUIRED"]);
    expect(result.repaymentScore).toBe(79);
  });

  it("explains every hard decline", () => {
    expect(loanEligibility({ ...base, requestedAmountCents: 500_000 }).reasons).toEqual([]);
    expect(loanEligibility({ ...base, standing: "SUSPENDED" }).reasons).toContain("MEMBER_NOT_ACTIVE");
    expect(loanEligibility({ ...base, standing: "EXITED", requestedAmountCents: 100 }).eligible).toBe(false);
    expect(loanEligibility({ ...base, hasActiveLoan: true }).reasons).toContain("ACTIVE_LOAN_EXISTS");
    expect(loanEligibility({ ...base, requestedMonths: 0 }).reasons).toContain("MONTHS_OUT_OF_RANGE");
    expect(loanEligibility({ ...base, requestedMonths: 7 }).reasons).toContain("MONTHS_OUT_OF_RANGE");
    expect(loanEligibility({ ...base, requestedAmountCents: 0 }).reasons).toContain("AMOUNT_NOT_POSITIVE");
    expect(loanEligibility({ ...base, requestedAmountCents: -5 }).reasons).toContain("AMOUNT_NOT_POSITIVE");

    const aboveSavingsCap = loanEligibility({
      ...base,
      requestedAmountCents: 4_000_000,
    });
    expect(aboveSavingsCap.reasons).toContain("ABOVE_MAX");
    expect(aboveSavingsCap.eligible).toBe(false);

    const pool = loanEligibility({
      ...base,
      requestedAmountCents: 400_000,
      savingsCents: 400_000,
      lendingPoolCents: 100_000,
    });
    expect(pool.maxAmountCents).toBe(100_000);
    expect(pool.reasons).toContain("POOL_EXHAUSTED");

    const cappedByDebt = loanEligibility({
      ...base,
      savingsCents: 100_000,
      outstandingBalanceCents: 0,
      requestedAmountCents: 1,
      lendingPoolCents: 0,
    });
    expect(cappedByDebt.maxAmountCents).toBe(0);
    expect(cappedByDebt.reasons).toContain("POOL_EXHAUSTED");

    expect(() => loanEligibility({ ...base, requestedAmountCents: 1.5 })).toThrow(MoneyError);
    expect(() => loanEligibility({ ...base, savingsMultiple: 0 })).toThrow(/multiple/);
    expect(() => loanEligibility({ ...base, minMonths: 0 })).toThrow(/month limits/);
    expect(() => loanEligibility({ ...base, requestedMonths: 1.2 })).toThrow(/months/);
  });
});

describe("allocatePayment", () => {
  const asOf = utc("2026-10-16");

  it("follows fines, due loans, arrears, the current month, then advance months", () => {
    const result = allocatePayment({
      amountCents: 250_000,
      asOf,
      fines: [
        { id: "new", amountCents: 10_000, status: "UNPAID", date: utc("2026-10-01") },
        { id: "old-b", amountCents: 5_000, status: "UNPAID", date: utc("2026-09-01") },
        { id: "old-a", amountCents: 15_000, status: "UNPAID", date: utc("2026-09-01") },
        { id: "paid", amountCents: 9_000, status: "PAID", date: utc("2026-08-01") },
        { id: "waived", amountCents: 8_000, status: "WAIVED", date: utc("2026-08-02") },
      ],
      installments: [
        {
          id: "future",
          dueDate: utc("2026-11-10"),
          principalDueCents: 40_000,
          interestDueCents: 10_000,
          paidAmountCents: 0,
        },
        {
          id: "due",
          dueDate: utc("2026-10-10"),
          principalDueCents: 40_000,
          interestDueCents: 10_000,
          paidAmountCents: 0,
        },
        {
          id: "settled",
          dueDate: utc("2026-09-10"),
          principalDueCents: 40_000,
          interestDueCents: 10_000,
          paidAmountCents: 50_000,
        },
      ],
      periods: [
        { period: "2026-11", expectedCents: 200_000, paidCents: 0 },
        { period: "2026-09", expectedCents: 200_000, paidCents: 150_000 },
        { period: "2026-10", expectedCents: 200_000, paidCents: 0 },
        { period: "2026-08", expectedCents: 200_000, paidCents: 200_000 },
      ],
    });

    expect(result.lines).toEqual([
      { bucket: "OVERDUE_FINE", targetId: "old-a", amountCents: 15_000 },
      { bucket: "OVERDUE_FINE", targetId: "old-b", amountCents: 5_000 },
      { bucket: "OVERDUE_FINE", targetId: "new", amountCents: 10_000 },
      { bucket: "OVERDUE_LOAN", targetId: "due", amountCents: 50_000 },
      { bucket: "CURRENT_CONTRIBUTION", targetId: "2026-09", amountCents: 50_000 },
      { bucket: "CURRENT_CONTRIBUTION", targetId: "2026-10", amountCents: 120_000 },
    ]);
    expect(result.unallocatedCents).toBe(0);
  });

  it("leaves money unallocated when nothing else is due and skips empty balances", () => {
    const result = allocatePayment({
      amountCents: 50_000,
      asOf,
      fines: [],
      installments: [],
      periods: [
        { period: "2026-10", expectedCents: 10_000, paidCents: 20_000 },
        { period: "2026-11", expectedCents: 10_000, paidCents: 0 },
      ],
    });
    expect(result.lines).toEqual([
      { bucket: "ADVANCE_CONTRIBUTION", targetId: "2026-11", amountCents: 10_000 },
    ]);
    expect(result.unallocatedCents).toBe(40_000);
    expect(() => allocatePayment({ amountCents: 0, asOf, fines: [], installments: [], periods: [] })).toThrow(
      /positive/,
    );
    expect(() =>
      allocatePayment({
        amountCents: 100,
        asOf,
        fines: [{ id: "x", amountCents: 1, status: "VOID" as "UNPAID", date: asOf }],
        installments: [],
        periods: [],
      }),
    ).toThrow(/fine status/);
  });
});

describe("pool, summary, and dividends", () => {
  it("holds back the reserve and can show an overdrawn pool", () => {
    expect(
      lendingPool({
        contributionCents: 1_000_000,
        interestEarnedCents: 50_000,
        finesCollectedCents: 5,
        loansOutstandingCents: 200_000,
        expenseCents: 10_000,
        welfarePayoutCents: 20_000,
        reserveBps: 1_000,
      }),
    ).toMatchObject({
      grossCents: 1_050_005,
      reserveCents: 105_001,
      poolCents: 1_050_005 - 200_000 - 10_000 - 20_000 - 105_001,
    });
    expect(
      lendingPool({
        contributionCents: 0,
        interestEarnedCents: 0,
        finesCollectedCents: 0,
        loansOutstandingCents: 100,
        expenseCents: 0,
        welfarePayoutCents: 0,
        reserveBps: 0,
      }).poolCents,
    ).toBe(-100);
    expect(() =>
      lendingPool({
        contributionCents: 0,
        interestEarnedCents: 0,
        finesCollectedCents: 0,
        loansOutstandingCents: 0,
        expenseCents: 0,
        welfarePayoutCents: 0,
        reserveBps: 10_001,
      }),
    ).toThrow(/reserve/);
    expect(() =>
      lendingPool({
        contributionCents: 0,
        interestEarnedCents: 0,
        finesCollectedCents: 0,
        loansOutstandingCents: 0,
        expenseCents: 0,
        welfarePayoutCents: 0,
        reserveBps: -1,
      }),
    ).toThrow(/reserve/);
  });

  it("summarises one period and caps the collection rate at 100%", () => {
    const summary = groupSummary({
      period: "2026-10",
      activeMembers: 19,
      expectedContributionCents: 100_000,
      contributions: [
        { period: "2026-10", amountCents: 40_000 },
        { period: "2026-09", amountCents: 90_000 },
        { period: "2026-10", amountCents: 80_000 },
      ],
      interestEarned: [{ period: "2026-10", amountCents: 5_000 }],
      finesCollected: [{ period: "2026-09", amountCents: 1_000 }],
      loansDisbursed: [{ period: "2026-10", amountCents: 7_000 }],
      expenses: [{ period: "2026-10", amountCents: 800 }],
      welfare: [{ period: "2026-10", amountCents: 2_000 }],
      loansOutstandingCents: 50_000,
      activeLoanCount: 4,
    });
    expect(summary.contributionCents).toBe(120_000);
    expect(summary.collectionRateBps).toBe(10_000);
    expect(summary.interestEarnedCents).toBe(5_000);
    expect(summary.finesCollectedCents).toBe(0);
    expect(summary.expenseCents).toBe(800);

    expect(
      groupSummary({
        period: "2026-11",
        activeMembers: 0,
        expectedContributionCents: 200_000,
        contributions: [{ period: "2026-11", amountCents: 50_000 }],
        interestEarned: [],
        finesCollected: [],
        loansDisbursed: [],
        expenses: [],
        welfare: [],
        loansOutstandingCents: 0,
        activeLoanCount: 0,
      }).collectionRateBps,
    ).toBe(2_500);

    expect(
      groupSummary({
        period: "2026-12",
        activeMembers: 1,
        expectedContributionCents: 0,
        contributions: [],
        interestEarned: [],
        finesCollected: [],
        loansDisbursed: [],
        expenses: [],
        welfare: [],
        loansOutstandingCents: 0,
        activeLoanCount: 0,
      }).collectionRateBps,
    ).toBe(10_000);

    expect(() =>
      groupSummary({
        period: "2026-10",
        activeMembers: -1,
        expectedContributionCents: 0,
        contributions: [],
        interestEarned: [],
        finesCollected: [],
        loansDisbursed: [],
        expenses: [],
        welfare: [],
        loansOutstandingCents: 0,
        activeLoanCount: 0,
      }),
    ).toThrow(/members/);
    expect(() =>
      groupSummary({
        period: "2026-10",
        activeMembers: 0,
        expectedContributionCents: 0,
        contributions: [],
        interestEarned: [],
        finesCollected: [],
        loansDisbursed: [],
        expenses: [],
        welfare: [],
        loansOutstandingCents: 0,
        activeLoanCount: -1,
      }),
    ).toThrow(/loans/);
    expect(() =>
      groupSummary({
        period: "bad",
        activeMembers: 0,
        expectedContributionCents: 0,
        contributions: [],
        interestEarned: [],
        finesCollected: [],
        loansDisbursed: [],
        expenses: [],
        welfare: [],
        loansOutstandingCents: 0,
        activeLoanCount: 0,
      }),
    ).toThrow(/period/);
  });

  it("splits a surplus by savings and keeps an undistributable balance", () => {
    const split = dividendProjection({
      year: 2026,
      interestEarnedCents: 100,
      finesCollectedCents: 20,
      expenseCents: 30,
      welfareCents: 10,
      members: [
        { membershipId: "m2", savingsCents: 2 },
        { membershipId: "m1", savingsCents: 4 },
      ],
    });
    expect(split.distributableCents).toBe(80);
    expect(split.members).toEqual([
      { membershipId: "m2", savingsCents: 2, dividendCents: 27 },
      { membershipId: "m1", savingsCents: 4, dividendCents: 53 },
    ]);
    expect(split.undistributedCents).toBe(0);

    const tie = dividendProjection({
      year: 2026,
      interestEarnedCents: 1,
      finesCollectedCents: 0,
      expenseCents: 0,
      welfareCents: 0,
      members: [
        { membershipId: "b", savingsCents: 5 },
        { membershipId: "a", savingsCents: 5 },
        { membershipId: "c", savingsCents: 0 },
      ],
    });
    expect(tie.members.map((member) => member.dividendCents)).toEqual([0, 1, 0]);

    const loss = dividendProjection({
      year: 2026,
      interestEarnedCents: 0,
      finesCollectedCents: 0,
      expenseCents: 500,
      welfareCents: 0,
      members: [],
    });
    expect(loss.distributableCents).toBe(0);
    expect(loss.undistributedCents).toBe(0);

    const idle = dividendProjection({
      year: 2026,
      interestEarnedCents: 400,
      finesCollectedCents: 0,
      expenseCents: 0,
      welfareCents: 0,
      members: [{ membershipId: "solo", savingsCents: 0 }],
    });
    expect(idle.undistributedCents).toBe(400);
    expect(idle.members[0].dividendCents).toBe(0);

    expect(compareDividendClaim(
      { remainder: 5n, savingsCents: 10, membershipId: "a" },
      { remainder: 2n, savingsCents: 10, membershipId: "b" },
    )).toBe(-1);
    expect(compareDividendClaim(
      { remainder: 2n, savingsCents: 10, membershipId: "b" },
      { remainder: 5n, savingsCents: 10, membershipId: "a" },
    )).toBe(1);
    expect(compareDividendClaim(
      { remainder: 4n, savingsCents: 20, membershipId: "b" },
      { remainder: 4n, savingsCents: 10, membershipId: "a" },
    )).toBe(-1);
    expect(compareDividendClaim(
      { remainder: 4n, savingsCents: 10, membershipId: "a" },
      { remainder: 4n, savingsCents: 20, membershipId: "b" },
    )).toBe(1);
    expect(compareDividendClaim(
      { remainder: 4n, savingsCents: 10, membershipId: "a" },
      { remainder: 4n, savingsCents: 10, membershipId: "b" },
    )).toBe(-1);
    expect(compareDividendClaim(
      { remainder: 4n, savingsCents: 10, membershipId: "b" },
      { remainder: 4n, savingsCents: 10, membershipId: "a" },
    )).toBe(1);

    expect(() =>
      dividendProjection({
        year: 1999,
        interestEarnedCents: 0,
        finesCollectedCents: 0,
        expenseCents: 0,
        welfareCents: 0,
        members: [],
      }),
    ).toThrow(/year/);
  });
});

describe("reconcile", () => {
  const base = {
    statedBalanceCents: 0,
    contributionCents: 1_000,
    loanRepaymentCents: 200,
    loanDisbursementCents: 300,
    expenseCents: 50,
    welfareCents: 25,
    unmatchedInboundCents: 0,
    unmatchedOutboundCents: 0,
  };

  it("explains a higher or lower bank balance, including what is still unexplained", () => {
    expect(reconcile({ ...base, statedBalanceCents: 825 }).likelyCauses).toEqual([]);
    expect(reconcile({ ...base, statedBalanceCents: 825 }).varianceCents).toBe(0);

    const inbound = reconcile({ ...base, statedBalanceCents: 1_000, unmatchedInboundCents: 100 });
    expect(inbound.appBalanceCents).toBe(825);
    expect(inbound.likelyCauses.map((cause) => cause.code)).toEqual(["UNMATCHED_INBOUND", "UNEXPLAINED"]);
    expect(inbound.likelyCauses[0].amountCents).toBe(100);
    expect(inbound.likelyCauses[1].amountCents).toBe(75);

    const explained = reconcile({ ...base, statedBalanceCents: 925, unmatchedInboundCents: 200 });
    expect(explained.likelyCauses).toHaveLength(1);
    expect(explained.likelyCauses[0].amountCents).toBe(100);

    const outbound = reconcile({ ...base, statedBalanceCents: 700, unmatchedOutboundCents: 50 });
    expect(outbound.likelyCauses.map((cause) => [cause.code, cause.amountCents])).toEqual([
      ["UNMATCHED_OUTBOUND", 50],
      ["UNEXPLAINED", -75],
    ]);

    const outboundFull = reconcile({ ...base, statedBalanceCents: 700, unmatchedOutboundCents: 125 });
    expect(outboundFull.likelyCauses.map((cause) => cause.code)).toEqual(["UNMATCHED_OUTBOUND"]);

    expect(reconcile({ ...base, statedBalanceCents: 900 }).likelyCauses[0].code).toBe("UNEXPLAINED");
    expect(reconcile({ ...base, statedBalanceCents: -10 }).varianceCents).toBe(-835);
    expect(() => reconcile({ ...base, contributionCents: -1 })).toThrow(MoneyError);
  });
});
