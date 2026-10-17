import { Shell } from "@/components/shell";
import { booksAsOf } from "@/lib/chama/clock";
import { requireSession, tenantFromSession } from "@/lib/chama/page-session";
import { loadMemberFile } from "@/lib/member/file";
import { runWithTenant } from "@/lib/tenancy/context";

export const dynamic = "force-dynamic";

export default async function MyLoanPage() {
  const session = await requireSession();
  const file = await runWithTenant(tenantFromSession(session), () =>
    loadMemberFile(session.membershipId, booksAsOf()),
  );

  return (
    <Shell chamaName={file.chamaName} personName={session.personName} role={session.role} current="/loan">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Member&apos;s view</p>
      <h1 className="mt-1 font-serif text-4xl">My loan</h1>
      <p className="mt-2 text-sm text-stone-600">{file.personName}. Other members&apos; loans stay with the treasurer.</p>
      {file.loans.length === 0 ? <p className="mt-6 text-sm text-stone-600">No loan on this membership.</p> : null}
      <div className="mt-4 space-y-4">
        {file.loans.map((loan) => (
          <article key={`${loan.purpose}-${loan.status}`} className="rounded-2xl border border-stone-300 bg-white/80 p-4 text-sm">
            <p className="font-medium">{loan.purpose}</p>
            <p className="text-stone-600">{loan.status.toLowerCase()} · principal {loan.principalLabel}</p>
            <table className="mt-3 w-full text-left">
              <thead className="text-stone-500">
                <tr>
                  <th className="py-1 font-medium">Due</th>
                  <th className="py-1 font-medium">Installment</th>
                  <th className="py-1 font-medium">Paid</th>
                  <th className="py-1 font-medium">Left</th>
                  <th className="py-1 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loan.installments.map((row) => (
                  <tr key={row.dueDate} className="border-t border-stone-200">
                    <td className="py-1">{row.dueDate}</td>
                    <td>{row.dueLabel}</td>
                    <td>{row.paidLabel}</td>
                    <td>{row.remainingLabel}</td>
                    <td>{row.status.toLowerCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </div>
    </Shell>
  );
}
