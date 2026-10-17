import type { ContributionCell } from "@/lib/chama/picture";

const TONE: Record<ContributionCell, string> = {
  PAID: "bg-emerald-100 text-emerald-950",
  LATE: "bg-amber-100 text-amber-950",
  MISSED: "bg-red-100 text-red-950",
  NOT_DUE: "bg-stone-100 text-stone-500",
};

const WORD: Record<ContributionCell, string> = {
  PAID: "Paid",
  LATE: "Late",
  MISSED: "Missed",
  NOT_DUE: "Not due",
};

export function MonthPill({ cell }: { cell: ContributionCell }) {
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[cell]}`}>{WORD[cell]}</span>;
}

export function monthWord(cell: ContributionCell): string {
  return WORD[cell];
}
