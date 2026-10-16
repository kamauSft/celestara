import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Stat } from "@/components/stat";
import { booksAsOf } from "@/lib/chama/clock";
import { loadDesk } from "@/lib/chama/load-desk";
import { requireSession, tenantFromSession } from "@/lib/chama/page-session";
import { isOfficial, runWithTenant } from "@/lib/tenancy/context";

export const dynamic = "force-dynamic";

export default async function DeskPage() {
  const session = await requireSession();
  if (!isOfficial(session.role)) redirect("/home");
  const desk = await runWithTenant(tenantFromSession(session), () => loadDesk(booksAsOf()));

  return (
    <Shell chamaName={desk.chamaName} personName={session.personName} role={session.role} current="/desk">
      <p className="text-sm text-stone-600">
        {desk.county} · books as of {desk.asOf} · audit {desk.auditIntact ? "intact" : "needs review"}
      </p>
      <h1 className="mt-1 font-serif text-4xl">Desk</h1>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Lending pool" value={desk.poolLabel} hint={`Reserve held ${desk.reserveLabel}`} />
        <Stat label={`${desk.period} collection`} value={desk.collectionRateLabel} hint={`${desk.collectedLabel} of ${desk.expectedLabel}`} />
        <Stat label="Loans still out" value={desk.loansOutstandingLabel} />
        <Stat label="Behind this month" value={String(desk.behind.length)} hint={`${desk.activeMembers} active members`} />
      </section>
      {desk.mpesaNeedsReview > 0 ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-stone-800">
          {desk.mpesaNeedsReview} M-Pesa receipts are waiting to be matched to a member.
        </p>
      ) : null}
      <section className="mt-8">
        <h2 className="font-serif text-2xl">Who is behind</h2>
        {desk.behind.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">Everyone is current.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="py-2 font-medium">Member</th>
                <th className="py-2 font-medium">Arrears</th>
                <th className="py-2 font-medium">Fines</th>
                <th className="py-2 font-medium">Overdue loan</th>
              </tr>
            </thead>
            <tbody>
              {desk.behind.map((row) => (
                <tr key={row.membershipId} className="border-t border-stone-200">
                  <td className="py-2">
                    <Link className="underline decoration-stone-300" href={`/statement?memberNo=${row.memberNo}`}>
                      {row.memberNo} {row.name}
                    </Link>
                  </td>
                  <td>{row.arrearsLabel}</td>
                  <td>{row.finesLabel}</td>
                  <td>{row.overdueLoanLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Shell>
  );
}
