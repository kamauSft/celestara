import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { booksAsOf } from "@/lib/chama/clock";
import { loadDesk } from "@/lib/chama/load-desk";
import { requireSession, tenantFromSession } from "@/lib/chama/page-session";
import { isOfficial, runWithTenant } from "@/lib/tenancy/context";
import type { ContributionCell } from "@/lib/chama/picture";

export const dynamic = "force-dynamic";

const TONE: Record<ContributionCell, string> = {
  PAID: "bg-emerald-100 text-emerald-900",
  LATE: "bg-amber-100 text-amber-950",
  MISSED: "bg-red-100 text-red-900",
  NOT_DUE: "bg-stone-100 text-stone-400",
};

const WORD: Record<ContributionCell, string> = {
  PAID: "Paid",
  LATE: "Late",
  MISSED: "Missed",
  NOT_DUE: "—",
};

export default async function ContributionsPage() {
  const session = await requireSession();
  if (!isOfficial(session.role)) redirect("/home");
  const desk = await runWithTenant(tenantFromSession(session), () => loadDesk(booksAsOf()));

  return (
    <Shell chamaName={desk.chamaName} personName={session.personName} role={session.role} current="/contributions">
      <h1 className="font-serif text-4xl">Contributions</h1>
      <p className="mt-1 text-sm text-stone-600">
        {desk.period} collected {desk.collectedLabel} of {desk.expectedLabel} ({desk.collectionRateLabel}).
      </p>
      <ul className="mt-4 flex flex-wrap gap-3 text-xs">
        {(["PAID", "LATE", "MISSED", "NOT_DUE"] as const).map((cell) => (
          <li key={cell} className={`rounded-full px-3 py-1 ${TONE[cell]}`}>
            {WORD[cell]}
          </li>
        ))}
      </ul>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-300 bg-white/80">
        <table className="min-w-max text-left text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-paper px-3 py-2 font-medium">Member</th>
              {desk.periods.map((period) => (
                <th key={period} className="px-2 py-2 font-medium text-stone-500">
                  {period.slice(2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {desk.grid.map((row) => (
              <tr key={row.membershipId} className="border-t border-stone-200">
                <th className="sticky left-0 bg-paper px-3 py-2 text-left font-medium">
                  {row.memberNo} {row.name.split(" ")[0]}
                </th>
                {row.cells.map((cell, index) => (
                  <td key={desk.periods[index]} className="px-1 py-1">
                    <span className={`block rounded px-1.5 py-1 text-center ${TONE[cell]}`}>{WORD[cell]}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
