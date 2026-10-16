import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignOut } from "@/components/sign-out";
import { getSession } from "@/lib/auth/service";
import { maskPhone } from "@/lib/auth/phone";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { formatKes } from "@/lib/finance";
import { loadMemberHome } from "@/lib/member/home";
import { prismaRaw } from "@/lib/db";
import { runWithTenant } from "@/lib/tenancy/context";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const session = token ? await getSession(token) : null;
  if (!session) redirect("/login");

  const person = await prismaRaw.person.findUnique({ where: { id: session.personId } });
  const home = await runWithTenant(
    {
      chamaId: session.chamaId,
      membershipId: session.membershipId,
      personId: session.personId,
      role: session.role,
    },
    () => loadMemberHome(session.membershipId),
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
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss">{home.chamaName}</p>
          <h1 className="mt-2 font-serif text-4xl">{home.personName}</h1>
          <p className="mt-1 text-sm text-stone-600">
            {home.role} · {home.memberNo} · {home.status} · {maskPhone(person?.phone ?? "")}
          </p>
        </div>
        <SignOut />
      </div>
      <p className="mt-6 rounded-2xl bg-white/80 px-4 py-3 text-sm text-stone-700">
        Audit chain: {home.auditIntact ? "intact" : "needs review"}. The full ledger screens arrive in the next phase.
      </p>
      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-stone-300 bg-white/80 p-4">
            <p className="text-sm text-stone-500">{label}</p>
            <p className="mt-1 font-serif text-2xl">{value}</p>
          </article>
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
    </main>
  );
}
