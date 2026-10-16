import { assertPeriod } from "./dates";
import { MoneyError, assertCents, divRound } from "./money";

export interface LendingPoolInput {
  contributionCents: number;
  interestEarnedCents: number;
  finesCollectedCents: number;
  loansOutstandingCents: number;
  expenseCents: number;
  welfarePayoutCents: number;
  reserveBps: number;
}

export function lendingPool(input: LendingPoolInput): {
  grossCents: number;
  reserveCents: number;
  poolCents: number;
} {
  assertCents(input.contributionCents, "contributions");
  assertCents(input.interestEarnedCents, "interest");
  assertCents(input.finesCollectedCents, "fines");
  assertCents(input.loansOutstandingCents, "loans outstanding");
  assertCents(input.expenseCents, "expenses");
  assertCents(input.welfarePayoutCents, "welfare");
  if (!Number.isInteger(input.reserveBps) || input.reserveBps < 0 || input.reserveBps > 10_000) {
    throw new MoneyError("reserve rate must be between 0 and 10000 basis points");
  }

  const grossCents =
    input.contributionCents + input.interestEarnedCents + input.finesCollectedCents;
  const reserveCents = Number(
    divRound(BigInt(grossCents) * BigInt(input.reserveBps), 10_000n),
  );
  return {
    grossCents,
    reserveCents,
    poolCents:
      grossCents -
      input.loansOutstandingCents -
      input.expenseCents -
      input.welfarePayoutCents -
      reserveCents,
  };
}

export interface GroupSummaryInput {
  period: string;
  activeMembers: number;
  expectedContributionCents: number;
  contributions: { period: string; amountCents: number }[];
  interestEarned: { period: string; amountCents: number }[];
  finesCollected: { period: string; amountCents: number }[];
  loansDisbursed: { period: string; amountCents: number }[];
  expenses: { period: string; amountCents: number }[];
  welfare: { period: string; amountCents: number }[];
  loansOutstandingCents: number;
  activeLoanCount: number;
}

function sumPeriod(rows: { period: string; amountCents: number }[], period: string, label: string): number {
  return rows.reduce((sum, row) => {
    assertCents(row.amountCents, label);
    return row.period === period ? sum + row.amountCents : sum;
  }, 0);
}

export function groupSummary(input: GroupSummaryInput) {
  assertPeriod(input.period);
  assertCents(input.expectedContributionCents, "expected contributions");
  assertCents(input.loansOutstandingCents, "loans outstanding");
  if (!Number.isInteger(input.activeMembers) || input.activeMembers < 0) {
    throw new MoneyError("active members must be a non-negative integer");
  }
  if (!Number.isInteger(input.activeLoanCount) || input.activeLoanCount < 0) {
    throw new MoneyError("active loans must be a non-negative integer");
  }

  const contributionCents = sumPeriod(input.contributions, input.period, "contribution");
  const collectionRateBps =
    input.expectedContributionCents === 0
      ? 10_000
      : Math.min(
          10_000,
          Number(
            divRound(BigInt(contributionCents) * 10_000n, BigInt(input.expectedContributionCents)),
          ),
        );

  return {
    period: input.period,
    contributionCents,
    expectedContributionCents: input.expectedContributionCents,
    collectionRateBps,
    interestEarnedCents: sumPeriod(input.interestEarned, input.period, "interest"),
    finesCollectedCents: sumPeriod(input.finesCollected, input.period, "fine"),
    loansDisbursedCents: sumPeriod(input.loansDisbursed, input.period, "disbursement"),
    loansOutstandingCents: input.loansOutstandingCents,
    expenseCents: sumPeriod(input.expenses, input.period, "expense"),
    welfareCents: sumPeriod(input.welfare, input.period, "welfare"),
    activeMembers: input.activeMembers,
    activeLoanCount: input.activeLoanCount,
  };
}

export interface DividendMemberInput {
  membershipId: string;
  savingsCents: number;
}

export function compareDividendClaim(
  a: { remainder: bigint; savingsCents: number; membershipId: string },
  b: { remainder: bigint; savingsCents: number; membershipId: string },
): number {
  if (a.remainder !== b.remainder) {
    return a.remainder > b.remainder ? -1 : 1;
  }
  if (a.savingsCents !== b.savingsCents) {
    return a.savingsCents > b.savingsCents ? -1 : 1;
  }
  if (a.membershipId < b.membershipId) return -1;
  return 1;
}

export function dividendProjection(input: {
  year: number;
  interestEarnedCents: number;
  finesCollectedCents: number;
  expenseCents: number;
  welfareCents: number;
  members: DividendMemberInput[];
}): {
  year: number;
  distributableCents: number;
  undistributedCents: number;
  members: { membershipId: string; savingsCents: number; dividendCents: number }[];
} {
  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) {
    throw new MoneyError("year is out of range");
  }
  assertCents(input.interestEarnedCents, "interest");
  assertCents(input.finesCollectedCents, "fines");
  assertCents(input.expenseCents, "expenses");
  assertCents(input.welfareCents, "welfare");

  const raw =
    input.interestEarnedCents +
    input.finesCollectedCents -
    input.expenseCents -
    input.welfareCents;
  const distributableCents = Math.max(0, raw);
  const drafted = input.members.map((member) => {
    assertCents(member.savingsCents, "savings");
    return { membershipId: member.membershipId, savingsCents: member.savingsCents, dividendCents: 0 };
  });

  const totalSavings = drafted.reduce((sum, member) => sum + member.savingsCents, 0);
  if (drafted.length === 0 || totalSavings === 0) {
    return {
      year: input.year,
      distributableCents,
      undistributedCents: distributableCents,
      members: drafted,
    };
  }

  const total = BigInt(totalSavings);
  const shares = drafted.map((member) => {
    const numerator = BigInt(distributableCents) * BigInt(member.savingsCents);
    return {
      ...member,
      dividendCents: Number(numerator / total),
      remainder: numerator % total,
    };
  });
  let leftover = distributableCents - shares.reduce((sum, share) => sum + share.dividendCents, 0);
  const order = [...shares].sort(compareDividendClaim);
  for (const share of order) {
    if (leftover === 0) break;
    share.dividendCents += 1;
    leftover -= 1;
  }

  return {
    year: input.year,
    distributableCents,
    undistributedCents: leftover,
    members: shares.map(({ membershipId, savingsCents, dividendCents }) => ({
      membershipId,
      savingsCents,
      dividendCents,
    })),
  };
}
