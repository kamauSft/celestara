import Link from "next/link";
import { MonthPill } from "@/components/month-pill";
import { Shell } from "@/components/shell";
import { Stat } from "@/components/stat";
import { booksAsOf } from "@/lib/chama/clock";
import { requireSession, tenantFromSession } from "@/lib/chama/page-session";
import { loadMemberHome } from "@/lib/member/home";
import { runWithTenant } from "@/lib/tenancy/context";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await requireSession();
  const home = await runWithTenant(tenantFromSession(session), () =>
    loadMemberHome(session.membershipId, booksAsOf()),
  );

  return (
    <Shell chamaName={home.chamaName} personName={home.personName} role={session.role} current="/home">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Member&apos;s view</p>
      <h1 className="mt-1 font-serif text-4xl">{home.personName.split(" ")[0]}&apos;s money</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        {home.memberNo} · {home.status}. This phone shows only this member. The treasurer&apos;s register is not here. Books as of {booksAsOf().toISOString().slice(0, 10)}. Audit {home.auditIntact ? "intact" : "needs review"}.
      </p>
      <section className="mt-6 rounded-3xl border border-stone-300 bg-white/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-stone-500">{home.periodLabel} contribution · due {home.monthlyDueLabel}</p>
            <p className="mt-1 font-serif text-3xl">{home.thisMonth === "PAID" || home.thisMonth === "LATE" ? "Recorded" : home.thisMonth === "MISSED" ? "Still to pay" : "Not due yet"}</p>
          </div>
          <MonthPill cell={home.thisMonth} />
        </div>
        {home.nextInstallment ? (
          <p className="mt-4 text-sm text-stone-700">
            Next loan installment: {home.nextInstallment.remainingLabel} on {home.nextInstallment.dueDate} for {home.nextInstallment.purpose}.
          </p>
        ) : (
          <p className="mt-4 text-sm text-stone-700">No loan installment is waiting.</p>
        )}
      </section>
      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Savings" value={home.savingsLabel} />
        <Stat label="Loan still due" value={home.loanLabel} />
        <Stat label="Unpaid fines" value={home.finesLabel} />
        <Stat label="Net" value={home.netLabel} hint={`Arrears ${home.arrearsLabel}`} />
      </section>
      {home.goals.length > 0 ? (
        <section className="mt-4 rounded-2xl border border-stone-300 bg-white/80 p-4">
          <h2 className="font-serif text-2xl">Goal</h2>
          {home.goals.map((goal) => (
            <div key={goal.title} className="mt-3">
              <p className="text-sm text-stone-700">{goal.title}: {goal.savedLabel} of {goal.targetLabel}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
                <div className="h-full bg-moss" style={{ width: `${goal.progressBps / 100}%` }} />
              </div>
            </div>
          ))}
        </section>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/mine" className="rounded-full border border-stone-400 px-4 py-2 text-sm">My months</Link>
        <Link href="/loan" className="rounded-full border border-stone-400 px-4 py-2 text-sm">My loan</Link>
        <Link href="/statement" className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-white">Statement</Link>
      </div>
    </Shell>
  );
}
