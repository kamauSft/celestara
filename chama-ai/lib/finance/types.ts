export type InterestType = "FLAT" | "REDUCING";

export type FineStatus = "UNPAID" | "PAID" | "WAIVED";

export type MembershipStanding = "ACTIVE" | "SUSPENDED" | "EXITED";

export interface ChamaRules {
  monthlyContributionCents: number;
  contributionDueDay: number;
  loanInterestRateBps: number;
  defaultInterestType: InterestType;
  maxLoanSavingsMultiple: number;
  loanMinMonths: number;
  loanMaxMonths: number;
  lateContributionFineCents: number;
  missedMeetingFineCents: number;
  lateInstallmentFineRateBps: number;
  reserveBps: number;
  treasurerApprovalLimitCents: number;
}

export interface ScheduleInstallment {
  sequence: number;
  dueDate: string;
  principalDueCents: number;
  interestDueCents: number;
  totalDueCents: number;
}
