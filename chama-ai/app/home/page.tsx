import Link from "next/link";
import { Shell } from "@/components/shell";
import { Stat } from "@/components/stat";
import { booksAsOf } from "@/lib/chama/clock";
import { requireSession, tenantFromSession } from "@/lib/chama/page-session";
import { formatKes } from "@/lib/finance";
import { loadMemberHome } from "@/lib/member/home";
import { maskPhone } from "@/lib/auth/phone";
import { prismaRaw } from "@/lib/db";
import { runWithTenant } from "@/lib/tenancy/context";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await requireSession();
  const person = await prismaRaw.person.findUnique({ where: { id: session.personId } });
  const home = await runWithTenant(tenantFromSession(session), () =>
    loadMemberHome(session.membershipId, booksAsOf()),
  );

  const cards = [
    ["Savings", home.savingsLabel],
    ["Loan balance", home.loanLabel],
    ["Unpaid fines", home.finesLabel],
    ["Net position", home.netLabel],
    ["Contribution arrears", home.arrearsLabel],
    ["Overdue installments", formatKes(home.overdueInstallmentCents)],
  ];

  return (
    <Shell chamaName={home.chamaName} personName={home.personName} role={session.role} current="/home">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">My position</h1>
          <p className="mt-1 text-sm text-stone-600">
            {home.memberNo} · {home.status} · {maskPhone(person?.phone ?? "")}
          </p>
        </div>
        <Link href="/statement" className="rounded-full border border-stone-400 px-4 py-2 text-sm">
          Open statement
        </Link>
      </div>
      <p className="mt-4 text-sm text-stone-600">
        Audit chain: {home.auditIntact ? "intact" : "needs review"}. Books shown as of {booksAsOf().toISOString().slice(0, 10)}.
      </p>
      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map(([label, value]) => (
          <Stat key={label} label={label} value={value} />
        ))}
      </section>
      {home.goals.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-stone-300 bg-white/80 p-4">
          <h2 className="font-serif text-2xl">Savings goal</h2>
          {home.goals.map((goal) => (
            <p key={goal.title} className="mt-2 text-sm text-stone-700">
              {goal.title}: {goal.savedLabel} saved toward {goal.targetLabel}
            </p>
          ))}
        </section>
      ) : null}
    </Shell>
  );
}
