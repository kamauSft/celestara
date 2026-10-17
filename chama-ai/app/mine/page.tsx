import { MonthPill } from "@/components/month-pill";
import { Shell } from "@/components/shell";
import { booksAsOf } from "@/lib/chama/clock";
import { requireSession, tenantFromSession } from "@/lib/chama/page-session";
import { loadMemberFile } from "@/lib/member/file";
import { runWithTenant } from "@/lib/tenancy/context";

export const dynamic = "force-dynamic";

export default async function MyMonthsPage() {
  const session = await requireSession();
  const file = await runWithTenant(tenantFromSession(session), () =>
    loadMemberFile(session.membershipId, booksAsOf()),
  );

  return (
    <Shell chamaName={file.chamaName} personName={session.personName} role={session.role} current="/mine">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Member&apos;s view</p>
      <h1 className="mt-1 font-serif text-4xl">My months</h1>
      <p className="mt-2 text-sm text-stone-600">{file.memberNo} {file.personName}. One row. Nobody else&apos;s column is on this page.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {file.cells.map((cell, index) => (
          <span key={file.periods[index]} className="rounded-xl border border-stone-200 bg-white/80 px-2 py-2 text-center text-xs">
            <span className="block text-stone-500">{file.periods[index]}</span>
            <span className="mt-1 block"><MonthPill cell={cell} /></span>
          </span>
        ))}
      </div>
    </Shell>
  );
}
