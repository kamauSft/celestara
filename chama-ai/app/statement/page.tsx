import { redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { Shell } from "@/components/shell";
import { requireSession, tenantFromSession } from "@/lib/chama/page-session";
import { loadStatement, membershipIdForMemberNo } from "@/lib/member/statement";
import { runWithTenant, TenantIsolationError } from "@/lib/tenancy/context";

export const dynamic = "force-dynamic";

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ memberNo?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const statement = await runWithTenant(tenantFromSession(session), async () => {
    const membershipId = query.memberNo
      ? await membershipIdForMemberNo(query.memberNo)
      : session.membershipId;
    if (!membershipId) return null;
    try {
      return await loadStatement(membershipId);
    } catch (error) {
      if (error instanceof TenantIsolationError) return "forbidden" as const;
      throw error;
    }
  });
  if (statement === "forbidden" || statement === null) redirect("/home");

  return (
    <Shell chamaName={statement.chamaName} personName={session.personName} role={session.role} current="/statement">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Statement</h1>
          <p className="mt-1 text-sm text-stone-600">
            {statement.memberNo} · {statement.personName}
          </p>
        </div>
        <PrintButton />
      </div>
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-stone-500">
          <tr>
            <th className="py-2 font-medium">Date</th>
            <th className="py-2 font-medium">Entry</th>
            <th className="py-2 font-medium">Savings</th>
            <th className="py-2 font-medium">Loan</th>
            <th className="py-2 font-medium">Fines</th>
          </tr>
        </thead>
        <tbody>
          {statement.lines.map((line, index) => (
            <tr key={`${line.date}-${index}`} className="border-t border-stone-200">
              <td className="py-2">{line.date}</td>
              <td>{line.description}</td>
              <td>{line.savingsLabel}</td>
              <td>{line.loanLabel}</td>
              <td>{line.finesLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}
