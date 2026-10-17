import { umojaSettings } from "../lib/chama/rules";
import {
  addMonthsClamped,
  dateOnly,
  dueDateForPeriod,
  loanSchedule,
  parseDateOnly,
  shiftPeriod,
} from "../lib/finance/index";

export const SEED_AS_OF = "2026-10-16";
export const DEMO_PIN = "2580";

export interface SeedMember {
  memberNo: string;
  name: string;
  phone: string;
  language: "EN" | "SW";
  role: "CHAIR" | "TREASURER" | "SECRETARY" | "AUDITOR" | "MEMBER";
  joinDate: string;
  exitDate: string | null;
  missedPeriods: string[];
  late: boolean;
}

export const members: SeedMember[] = [
  { memberNo: "M001", name: "Grace Wanjiku Mwangi", phone: "+254712345001", language: "EN", role: "CHAIR", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M002", name: "Peter Otieno Omondi", phone: "+254712345002", language: "EN", role: "TREASURER", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M003", name: "Faith Nafula Wekesa", phone: "+254712345003", language: "SW", role: "SECRETARY", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M004", name: "Daniel Kiptoo Cheruiyot", phone: "+254712345004", language: "EN", role: "AUDITOR", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M005", name: "Amina Hassan Bakari", phone: "+254712345005", language: "SW", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M006", name: "James Mutiso Ndeti", phone: "+254712345006", language: "EN", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: ["2025-06", "2026-09", "2026-10"], late: true },
  { memberNo: "M007", name: "Mercy Achieng Odhiambo", phone: "+254712345007", language: "EN", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M008", name: "Brian Kipchoge Rotich", phone: "+254712345008", language: "EN", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M009", name: "Lucy Wambui Kariuki", phone: "+254712345009", language: "EN", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: ["2026-10"], late: true },
  { memberNo: "M010", name: "Hassan Ali Juma", phone: "+254712345010", language: "SW", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M011", name: "Esther Nekesa Barasa", phone: "+254712345011", language: "SW", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M012", name: "Samuel Kiprono Bett", phone: "+254712345012", language: "EN", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M013", name: "Caroline Muthoni Gitau", phone: "+254712345013", language: "EN", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M014", name: "Kevin Owuor Adhiambo", phone: "+254712345014", language: "EN", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: ["2026-08", "2026-09", "2026-10"], late: true },
  { memberNo: "M015", name: "Purity Mumbua Kioko", phone: "+254712345015", language: "EN", role: "MEMBER", joinDate: "2025-05-01", exitDate: "2026-03-18", missedPeriods: [], late: false },
  { memberNo: "M016", name: "Joseph Were Simiyu", phone: "+254712345016", language: "EN", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M017", name: "Halima Omar Swaleh", phone: "+254712345017", language: "SW", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M018", name: "David Kamau Njoroge", phone: "+254712345018", language: "EN", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M019", name: "Rose Chebet Langat", phone: "+254712345019", language: "EN", role: "MEMBER", joinDate: "2025-05-01", exitDate: null, missedPeriods: [], late: false },
  { memberNo: "M020", name: "Stephen Muema Mutua", phone: "+254712345020", language: "EN", role: "MEMBER", joinDate: "2026-01-03", exitDate: null, missedPeriods: [], late: false },
];

export interface SeedContribution {
  memberNo: string;
  period: string;
  amountCents: number;
  datePaid: string;
  method: "CASH" | "MPESA";
  reference: string | null;
}

export interface SeedFine {
  memberNo: string;
  type: "LATE_CONTRIBUTION" | "MISSED_MEETING" | "LATE_INSTALLMENT";
  amountCents: number;
  date: string;
  reason: string;
}

export function periodsOwed(member: SeedMember, asOf = SEED_AS_OF): string[] {
  let period = member.joinDate.slice(0, 7);
  const asOfDate = parseDateOnly(asOf);
  const exit = member.exitDate ? parseDateOnly(member.exitDate) : null;
  if (member.joinDate > dateOnly(dueDateForPeriod(period, umojaSettings.contributionDueDay))) {
    period = shiftPeriod(period, 1);
  }
  const periods: string[] = [];
  while (dateOnly(dueDateForPeriod(period, umojaSettings.contributionDueDay)) <= dateOnly(asOfDate)) {
    const due = dueDateForPeriod(period, umojaSettings.contributionDueDay);
    if (!exit || dateOnly(exit) >= dateOnly(due)) periods.push(period);
    period = shiftPeriod(period, 1);
  }
  return periods;
}

export function buildContributions(asOf = SEED_AS_OF): { contributions: SeedContribution[]; fines: SeedFine[] } {
  const contributions: SeedContribution[] = [];
  const fines: SeedFine[] = [];
  for (const member of members) {
    for (const period of periodsOwed(member, asOf)) {
      if (member.missedPeriods.includes(period)) {
        fines.push({
          memberNo: member.memberNo,
          type: "LATE_CONTRIBUTION",
          amountCents: umojaSettings.lateContributionFineCents,
          date: dateOnly(dueDateForPeriod(period, umojaSettings.contributionDueDay)),
          reason: `Missed the ${period} contribution`,
        });
        continue;
      }
      const day = member.late ? "16" : "03";
      const datePaid = `${period}-${day}`;
      if (datePaid > asOf) continue;
      const method = Number(member.memberNo.slice(1)) % 2 === 0 ? "CASH" : "MPESA";
      contributions.push({
        memberNo: member.memberNo,
        period,
        amountCents: umojaSettings.monthlyContributionCents,
        datePaid,
        method,
        reference: method === "MPESA" ? `QJ${period.replace("-", "")}${member.memberNo}` : null,
      });
      if (member.late) {
        fines.push({
          memberNo: member.memberNo,
          type: "LATE_CONTRIBUTION",
          amountCents: umojaSettings.lateContributionFineCents,
          date: datePaid,
          reason: `Paid the ${period} contribution after the 5th`,
        });
      }
    }
  }
  return { contributions, fines };
}

export interface LoanSpec {
  memberNo: string;
  principalCents: number;
  months: number;
  purpose: string;
  applicationDate: string;
  issueDate: string | null;
  installmentsToPay: number;
  outcome: "PAID" | "ACTIVE" | "DEFAULTED" | "REJECTED";
  guarantors?: { memberNo: string; amountCents: number }[];
}

export const loans: LoanSpec[] = [
  { memberNo: "M001", principalCents: 1_000_000, months: 4, purpose: "School fees", applicationDate: "2025-12-01", issueDate: "2025-12-10", installmentsToPay: 4, outcome: "PAID" },
  { memberNo: "M003", principalCents: 600_000, months: 2, purpose: "Stock for the kiosk", applicationDate: "2025-08-01", issueDate: "2025-08-05", installmentsToPay: 2, outcome: "PAID" },
  { memberNo: "M004", principalCents: 800_000, months: 3, purpose: "Farm inputs", applicationDate: "2025-09-10", issueDate: "2025-09-15", installmentsToPay: 3, outcome: "PAID" },
  { memberNo: "M009", principalCents: 500_000, months: 1, purpose: "Medical bill", applicationDate: "2025-10-01", issueDate: "2025-10-05", installmentsToPay: 1, outcome: "PAID" },
  { memberNo: "M010", principalCents: 1_000_000, months: 2, purpose: "Fishing gear", applicationDate: "2025-12-01", issueDate: "2025-12-08", installmentsToPay: 2, outcome: "PAID" },
  { memberNo: "M013", principalCents: 1_200_000, months: 4, purpose: "Shop repairs", applicationDate: "2026-01-04", issueDate: "2026-01-10", installmentsToPay: 4, outcome: "PAID" },
  { memberNo: "M015", principalCents: 400_000, months: 2, purpose: "Travel home", applicationDate: "2025-07-01", issueDate: "2025-07-06", installmentsToPay: 2, outcome: "PAID" },
  { memberNo: "M018", principalCents: 1_000_000, months: 3, purpose: "Motorbike repair", applicationDate: "2026-02-02", issueDate: "2026-02-09", installmentsToPay: 3, outcome: "PAID" },
  { memberNo: "M019", principalCents: 1_100_000, months: 2, purpose: "Dairy cow feed", applicationDate: "2026-03-04", issueDate: "2026-03-11", installmentsToPay: 2, outcome: "PAID" },
  { memberNo: "M002", principalCents: 3_000_000, months: 6, purpose: "Expand the hardware stall", applicationDate: "2026-08-01", issueDate: "2026-08-10", installmentsToPay: 2, outcome: "ACTIVE" },
  { memberNo: "M005", principalCents: 1_200_000, months: 4, purpose: "School fees", applicationDate: "2026-09-01", issueDate: "2026-09-06", installmentsToPay: 1, outcome: "ACTIVE" },
  { memberNo: "M008", principalCents: 2_500_000, months: 5, purpose: "Posho mill service", applicationDate: "2026-07-01", issueDate: "2026-07-08", installmentsToPay: 3, outcome: "ACTIVE" },
  { memberNo: "M012", principalCents: 900_000, months: 3, purpose: "Seeds and fertiliser", applicationDate: "2026-09-08", issueDate: "2026-09-12", installmentsToPay: 1, outcome: "ACTIVE" },
  {
    memberNo: "M006",
    principalCents: 1_800_000,
    months: 6,
    purpose: "Boda boda repair",
    applicationDate: "2025-11-02",
    issueDate: "2025-11-10",
    installmentsToPay: 2,
    outcome: "DEFAULTED",
    guarantors: [
      { memberNo: "M018", amountCents: 400_000 },
      { memberNo: "M013", amountCents: 400_000 },
    ],
  },
  { memberNo: "M017", principalCents: 20_000_000, months: 6, purpose: "Wholesale stock", applicationDate: "2026-07-01", issueDate: null, installmentsToPay: 0, outcome: "REJECTED" },
];

export function loanRows(spec: LoanSpec) {
  if (!spec.issueDate) return [];
  return loanSchedule({
    principalCents: spec.principalCents,
    rateBps: umojaSettings.loanInterestRateBps,
    months: spec.months,
    type: "FLAT",
    firstDueDate: addMonthsClamped(parseDateOnly(spec.issueDate), 1),
  });
}

export function savingsCentsAt(memberNo: string, onDate: string): number {
  const { contributions } = buildContributions();
  return contributions
    .filter((row) => row.memberNo === memberNo && row.datePaid <= onDate)
    .reduce((sum, row) => sum + row.amountCents, 0);
}

export const meetingAbsences = [
  { date: "2025-08-07", memberNo: "M006" },
  { date: "2026-01-07", memberNo: "M014" },
  { date: "2026-06-07", memberNo: "M009" },
];

export function meetingDates(): string[] {
  const dates: string[] = [];
  let period = "2025-05";
  while (period <= "2026-10") {
    dates.push(`${period}-07`);
    period = shiftPeriod(period, 1);
  }
  return dates;
}

export const expenses = [
  { description: "Receipt books and pens", amountCents: 150_000, date: "2025-08-02", method: "CASH" as const },
  { description: "AGM tea and mandazi", amountCents: 480_000, date: "2025-12-14", method: "CASH" as const },
  { description: "Travel to the bank", amountCents: 80_000, date: "2026-04-03", method: "MPESA" as const },
];

export const welfare = [
  { memberNo: "M013", type: "BEREAVEMENT" as const, amountCents: 1_000_000, description: "Bereavement support for Caroline's family", date: "2025-09-20" },
  { memberNo: "M016", type: "ILLNESS" as const, amountCents: 500_000, description: "Hospital support for Joseph", date: "2026-02-11" },
];

export const polls = [
  {
    question: "Should monthly loan interest fall from 10% to 8%?",
    opensAt: "2026-04-07",
    closesAt: "2026-04-14",
    yes: ["M001", "M002", "M003", "M004", "M005", "M007", "M008", "M016"],
    no: ["M006", "M009", "M010", "M011", "M012", "M013", "M014", "M017", "M018", "M019"],
  },
  {
    question: "Should the monthly meeting move to the first Saturday?",
    opensAt: "2026-08-07",
    closesAt: "2026-08-14",
    yes: ["M001", "M002", "M003", "M004", "M005", "M007", "M008", "M010", "M011", "M012", "M013", "M016", "M018", "M019", "M020"],
    no: ["M006", "M009"],
  },
];

export const mpesaQueue = [
  { transId: "SFI8K2L9Q1", amountCents: 200_000, phone: "+254799111222", billRef: "UNKNOWN", status: "NEEDS_REVIEW" as const },
  { transId: "SFI3M8N0R2", amountCents: 500_000, phone: "+254711000333", billRef: "M099", status: "NEEDS_REVIEW" as const },
  { transId: "SFI7P4Q2T6", amountCents: 200_000, phone: "+254722000444", billRef: "", status: "NEEDS_REVIEW" as const },
];

export const agentRuns = [
  { agent: "Collections Agent", trigger: "schedule", inputSummary: "October due date is in three days", output: "Collections Agent sent 6 reminders for October contributions.", tools: ["arrears", "memberStatement"] },
  { agent: "Reconciliation Agent", trigger: "event", inputSummary: "New Paybill statement", output: "Reconciliation Agent left 3 M-Pesa receipts in the review queue.", tools: ["reconcile"] },
  { agent: "Reports Agent", trigger: "schedule", inputSummary: "September close", output: "Reports Agent prepared September statements for 19 members.", tools: ["groupSummary", "memberStatement"] },
  { agent: "Treasurer Copilot", trigger: "message", inputSummary: "Who is behind on September?", output: "Treasurer Copilot listed the members who still owe September.", tools: ["arrears"] },
  { agent: "Member Assistant", trigger: "message", inputSummary: "Salio langu ni ngapi?", output: "Member Assistant told Amina her savings, loan balance, and next due date.", tools: ["memberNetPosition"] },
  { agent: "Watchdog Agent", trigger: "schedule", inputSummary: "Weekly trust review", output: "Watchdog Agent noted the treasurer's loan was approved by the chair and the secretary.", tools: ["loanApprovalsSatisfied"] },
  { agent: "Secretary Agent", trigger: "schedule", inputSummary: "October meeting", output: "Secretary Agent drafted the October meeting agenda from arrears and open loans.", tools: ["groupSummary"] },
  { agent: "Onboarding Agent", trigger: "event", inputSummary: "May 2025 register", output: "Onboarding Agent imported the opening register for Umoja Savings Group.", tools: ["parseChamaSettings"] },
];
