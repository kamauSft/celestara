import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { booksAsOf } from "@/lib/chama/clock";
import { loadDesk } from "@/lib/chama/load-desk";
import { requireSession, tenantFromSession } from "@/lib/chama/page-session";
import { isOfficial, runWithTenant } from "@/lib/tenancy/context";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const session = await requireSession();
  if (!isOfficial(session.role)) redirect("/home");
  const desk = await runWithTenant(tenantFromSession(session), () => loadDesk(booksAsOf()));

  return (
    <Shell chamaName={desk.chamaName} personName={session.personName} role={session.role} current="/receipts">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Treasurer&apos;s view</p>
      <h1 className="mt-1 font-serif text-4xl">Receipts to match</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Money arrived on M-Pesa and is not yet a member&apos;s contribution. A member does not see this queue.
      </p>
      <ul className="mt-6 space-y-3">
        {desk.receipts.map((receipt) => (
          <li key={receipt.transId} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium">{receipt.amountLabel}</p>
            <p className="mt-1 text-stone-700">Receipt {receipt.transId}</p>
            <p className="text-stone-700">Phone {receipt.phoneMasked}</p>
            <p className="text-stone-700">Account {receipt.billRef}</p>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
