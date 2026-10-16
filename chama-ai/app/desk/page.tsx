import Link from "next/link";
import { redirect } from "next/navigation";
import { MonthPill } from "@/components/month-pill";
import { Shell } from "@/components/shell";
import { Stat } from "@/components/stat";
import { booksAsOf } from "@/lib/chama/clock";
import { loadDesk } from "@/lib/chama/load-desk";
import { requireSession, tenantFromSession } from "@/lib/chama/page-session";
import { isOfficial, runWithTenant } from "@/lib/tenancy/context";

export const dynamic = "force-dynamic";

const ORDER = { MISSED: 0, LATE: 1, PAID: 2, NOT_DUE: 3 };

export default async function DeskPage() {
  const session = await requireSession();
  if (!isOfficial(session.role)) redirect("/home");
  const desk = await runWithTenant(tenantFromSession(session), () => loadDesk(booksAsOf()));
  const register = [...desk.members].sort(
    (a, b) => ORDER[a.thisMonth] - ORDER[b.thisMonth] || a.memberNo.localeCompare(b.memberNo),
  );

  return (
    <Shell chamaName={desk.chamaName} personName={session.personName} role={session.role} current="/desk">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Treasurer&apos;s view</p>
      <h1 className="mt-1 font-serif text-4xl">{desk.periodLabel} meeting</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Every member is on this page. A member who signs in is sent away from it. Books as of {desk.asOf}. Audit {desk.auditIntact ? "intact" : "needs review"}.
      </p>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Paid this month" value={String(desk.monthTally.PAID)} hint={`of ${desk.monthTally.PAID + desk.monthTally.LATE + desk.monthTally.MISSED} who owe`} />
        <Stat label="Missed this month" value={String(desk.monthTally.MISSED)} hint={`${desk.monthTally.LATE} paid late`} />
        <Stat label="Collected" value={desk.collectionRateLabel} hint={`${desk.collectedLabel} of ${desk.expectedLabel}`} />
        <Stat label="Safe to lend" value={desk.poolLabel} hint={`Reserve ${desk.reserveLabel}`} />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-stone-300 bg-white/80 p-4">
          <h2 className="font-serif text-2xl">Chase before the meeting</h2>
          <ul className="mt-3 space-y-3">
            {desk.behind.map((row) => (
              <li key={row.membershipId} className="border-t border-stone-200 pt-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link className="font-medium underline decoration-stone-300" href={`/members/${row.memberNo}`}>
                    {row.memberNo} {row.name}
                  </Link>
                  <MonthPill cell={row.thisMonth} />
                </div>
                <p className="mt-1 text-stone-600">
                  Arrears {row.arrearsLabel} · fines {row.finesLabel} · overdue loan {row.overdueLoanLabel}
                </p>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-serif text-2xl">M-Pesa still unmatched</h2>
          <ul className="mt-3 space-y-3">
            {desk.receipts.map((receipt) => (
              <li key={receipt.transId} className="border-t border-amber-200 pt-3 text-sm">
                <p className="font-medium">{receipt.amountLabel} · {receipt.transId}</p>
                <p className="text-stone-700">{receipt.phoneMasked} · account {receipt.billRef}</p>
              </li>
            ))}
          </ul>
          <Link href="/receipts" className="mt-4 inline-block text-sm underline">Open the receipt queue</Link>
        </article>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Register</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="py-2 font-medium">Member</th>
                <th className="py-2 font-medium">{desk.periodLabel}</th>
                <th className="py-2 font-medium">Savings</th>
                <th className="py-2 font-medium">Loan</th>
                <th className="py-2 font-medium">Arrears</th>
              </tr>
            </thead>
            <tbody>
              {register.map((member) => (
                <tr key={member.membershipId} className="border-t border-stone-200">
                  <td className="py-2">
                    <Link className="underline decoration-stone-300" href={`/members/${member.memberNo}`}>
                      {member.memberNo} {member.name}
                    </Link>
                    <p className="text-xs text-stone-500">{member.role} · {member.phoneMasked}</p>
                  </td>
                  <td><MonthPill cell={member.thisMonth} /></td>
                  <td>{member.savingsLabel}</td>
                  <td>{member.loanLabel}</td>
                  <td>{member.arrearsLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
