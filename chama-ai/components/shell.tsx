import Link from "next/link";
import { SignOut } from "./sign-out";
import { isOfficial } from "@/lib/tenancy/context";
import { roleLabel } from "@/lib/chama/picture";

const OFFICIAL_LINKS = [
  ["Treasurer", "/desk"],
  ["Register", "/members"],
  ["Months", "/contributions"],
  ["Loans", "/loans"],
  ["Receipts", "/receipts"],
] as const;

const MEMBER_LINKS = [
  ["My money", "/home"],
  ["My months", "/mine"],
  ["My loan", "/loan"],
  ["Statement", "/statement"],
] as const;

export function Shell({
  chamaName,
  personName,
  role,
  current,
  children,
}: {
  chamaName: string;
  personName: string;
  role: "CHAIR" | "TREASURER" | "SECRETARY" | "MEMBER" | "AUDITOR";
  current: string;
  children: React.ReactNode;
}) {
  const links = isOfficial(role) ? OFFICIAL_LINKS : MEMBER_LINKS;
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6">
      <header className="no-print flex flex-wrap items-end justify-between gap-4 border-b border-stone-300 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">Kikapu · {chamaName}</p>
          <p className="mt-1 text-sm text-stone-600">
            {personName} · {roleLabel(role)}
          </p>
        </div>
        <SignOut />
      </header>
      <nav className="no-print mt-4 flex flex-wrap gap-2">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className={
              href === current
                ? "rounded-full bg-moss px-3 py-1.5 text-sm font-semibold text-white"
                : "rounded-full border border-stone-300 bg-white/70 px-3 py-1.5 text-sm text-stone-700"
            }
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
