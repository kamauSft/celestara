import { z } from "zod";

export const chamaSettingsSchema = z.object({
  monthlyContributionCents: z.number().int().positive(),
  contributionDueDay: z.number().int().min(1).max(28),
  loanInterestRateBps: z.number().int().min(0).max(10_000),
  defaultInterestType: z.enum(["FLAT", "REDUCING"]),
  maxLoanSavingsMultiple: z.number().int().min(1),
  loanMinMonths: z.number().int().min(1).max(36),
  loanMaxMonths: z.number().int().min(1).max(36),
  lateContributionFineCents: z.number().int().nonnegative(),
  missedMeetingFineCents: z.number().int().nonnegative(),
  lateInstallmentFineRateBps: z.number().int().min(0).max(10_000),
  reserveBps: z.number().int().min(0).max(10_000),
  treasurerApprovalLimitCents: z.number().int().nonnegative(),
  defaultersListVisible: z.boolean(),
  quietHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  constitution: z.string().min(20),
});

export type ChamaSettings = z.infer<typeof chamaSettingsSchema>;

export function parseChamaSettings(value: unknown): ChamaSettings {
  const settings = chamaSettingsSchema.parse(value);
  if (settings.loanMaxMonths < settings.loanMinMonths) {
    throw new Error("loanMaxMonths cannot be less than loanMinMonths");
  }
  return settings;
}

export const UMOJA_CONSTITUTION = `Umoja Savings Group constitution (demo).
1. Each active member contributes KES 2,000 by the 5th of every month.
2. A contribution paid after the 5th attracts a late fine of KES 200. Missing a meeting without apology attracts a fine of KES 100.
3. A member may hold one loan at a time, for 1 to 6 months. Interest is 10 percent per month, flat on the principal, unless the members vote to use reducing balance.
4. The most a member can borrow is three times their savings, less any outstanding loan, and never more than the lending pool. A loan larger than the member's own savings needs guarantors whose savings cover the difference.
5. The treasurer may approve a loan up to KES 20,000. A larger loan also needs the chair. No official may approve their own loan.
6. Payments are applied in this order: overdue fines, overdue loan installments, the current contribution, then advance contributions.
7. Ten percent of contributions, interest, and fines is kept as a reserve and is not available to lend.
8. Every member may see their own records at any time. Another member's balance stays private unless the group turns on the defaulters list.`;

export const umojaSettings: ChamaSettings = {
  monthlyContributionCents: 200_000,
  contributionDueDay: 5,
  loanInterestRateBps: 1_000,
  defaultInterestType: "FLAT",
  maxLoanSavingsMultiple: 3,
  loanMinMonths: 1,
  loanMaxMonths: 6,
  lateContributionFineCents: 20_000,
  missedMeetingFineCents: 10_000,
  lateInstallmentFineRateBps: 500,
  reserveBps: 1_000,
  treasurerApprovalLimitCents: 2_000_000,
  defaultersListVisible: false,
  quietHours: { start: "20:00", end: "07:00" },
  constitution: UMOJA_CONSTITUTION,
};
