import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { booksAsOf } from "@/lib/chama/clock";
import { loadDesk } from "@/lib/chama/load-desk";
import { requireSession, tenantFromSession } from "@/lib/chama/page-session";
import { isOfficial, runWithTenant } from "@/lib/tenancy/context";

export const dynamic = "force-dynamic";

const GROUPS = [
  { title: "Open", statuses: ["DISBURSED", "ACTIVE", "DEFAULTED"] },
  { title: "Waiting", statuses: ["APPLIED", "UNDER_REVIEW", "APPROVED"] },
  { title: "Repaid", statuses: ["PAID"] },
  { title: "Declined", statuses: ["REJECTED"] },
] as const;

export default async function LoansPage() {
  const session = await requireSession();
  if (!isOfficial(session.role)) redirect("/home");
  const desk = await runWithTenant(tenantFromSession(session), () => loadDesk(booksAsOf()));

  return (
    <Shell chamaName={desk.chamaName} personName={session.personName} role={session.role} current="/loans">
      <h1 className="font-serif text-4xl">Loans</h1>
      <p className="mt-1 text-sm text-stone-600">Still out: {desk.loansOutstandingLabel}. Pool left to lend: {desk.poolLabel}.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {GROUPS.map((group) => {
          const rows = desk.loans.filter((loan) => (group.statuses as readonly string[]).includes(loan.status));
          return (
            <section key={group.title} className="rounded-2xl border border-stone-300 bg-white/80 p-4">
              <h2 className="font-serif text-2xl">
                {group.title} <span className="text-base text-stone-500">{rows.length}</span>
              </h2>
              {rows.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">None.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {rows.map((loan) => (
                    <li key={`${loan.memberNo}-${loan.purpose}-${loan.status}`} className="border-t border-stone-200 pt-3 text-sm">
                      <p className="font-medium">
                        {loan.memberNo} {loan.name}
                      </p>
                      <p className="text-stone-600">
                        {loan.purpose} · {loan.months} months · {loan.status === "DEFAULTED" ? "Defaulted" : loan.status.toLowerCase()}
                      </p>
                      <p>
                        {loan.principalLabel} principal · {loan.balanceLabel} still due
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </Shell>
  );
}
