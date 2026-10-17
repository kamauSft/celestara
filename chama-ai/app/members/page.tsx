import Link from "next/link";
import { redirect } from "next/navigation";
import { MonthPill } from "@/components/month-pill";
import { Shell } from "@/components/shell";
import { booksAsOf } from "@/lib/chama/clock";
import { loadDesk } from "@/lib/chama/load-desk";
import { requireSession, tenantFromSession } from "@/lib/chama/page-session";
import { isOfficial, runWithTenant } from "@/lib/tenancy/context";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const session = await requireSession();
  if (!isOfficial(session.role)) redirect("/home");
  const desk = await runWithTenant(tenantFromSession(session), () => loadDesk(booksAsOf()));

  return (
    <Shell chamaName={desk.chamaName} personName={session.personName} role={session.role} current="/members">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Treasurer&apos;s view</p>
      <h1 className="mt-1 font-serif text-4xl">Register</h1>
      <p className="mt-1 text-sm text-stone-600">{desk.activeMembers} active · open a name to see that member&apos;s own months and loan.</p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="text-stone-500">
            <tr>
              <th className="py-2 font-medium">Member</th>
              <th className="py-2 font-medium">{desk.periodLabel}</th>
              <th className="py-2 font-medium">Role</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium">Savings</th>
              <th className="py-2 font-medium">Loan</th>
              <th className="py-2 font-medium">Fines</th>
              <th className="py-2 font-medium">Arrears</th>
            </tr>
          </thead>
          <tbody>
            {desk.members.map((member) => (
              <tr key={member.membershipId} className="border-t border-stone-200">
                <td className="py-2">
                  <Link className="underline decoration-stone-300" href={`/members/${member.memberNo}`}>
                    {member.memberNo} {member.name}
                  </Link>
                  <p className="text-xs text-stone-500">{member.phoneMasked}</p>
                </td>
                <td><MonthPill cell={member.thisMonth} /></td>
                <td>{member.role}</td>
                <td>{member.status}</td>
                <td>{member.savingsLabel}</td>
                <td>{member.loanLabel}</td>
                <td>{member.finesLabel}</td>
                <td>{member.arrearsLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
