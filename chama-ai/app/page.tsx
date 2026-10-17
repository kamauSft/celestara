import Link from "next/link";
import { monthlyPriceCents } from "@/lib/chama/picture";
import { formatKes } from "@/lib/finance";

const EXAMPLE_MEMBERS = 19;
const standard = formatKes(monthlyPriceCents("STANDARD", EXAMPLE_MEMBERS));
const pro = formatKes(monthlyPriceCents("PRO", EXAMPLE_MEMBERS));

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-moss">Kikapu · Umoja Savings Group</p>
      <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-tight text-ink">
        Two doors. The treasurer sees the group. A member sees only herself.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-stone-700">
        October 2026 is loaded. The treasurer opens the meeting register. Amina opens her own money and cannot open his.
      </p>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-moss bg-moss p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Treasurer&apos;s view</p>
          <h2 className="mt-2 font-serif text-3xl">Peter Otieno</h2>
          <p className="mt-3 text-sm text-white/90">
            Who paid October, who missed it, what is still safe to lend, which loans are open, and three M-Pesa receipts with no member attached.
          </p>
          <Link href="/login?who=treasurer" className="mt-6 inline-block rounded-full bg-white px-5 py-3 text-sm font-semibold text-moss">
            Open the treasurer&apos;s books
          </Link>
        </article>
        <article className="rounded-3xl border border-stone-300 bg-white/80 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Member&apos;s view</p>
          <h2 className="mt-2 font-serif text-3xl">Amina Hassan</h2>
          <p className="mt-3 text-sm text-stone-700">
            Her savings, the school-fees loan, the months she paid, and a statement she can print. James&apos;s arrears are not on this screen.
          </p>
          <Link href="/login?who=member" className="mt-6 inline-block rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white">
            Open Amina&apos;s money
          </Link>
        </article>
      </section>

      <p className="mt-6 text-sm text-stone-600">
        Chair Grace uses the same treasurer books. <Link className="underline" href="/login?who=chair">Open as chair</Link>. A member signs in with their number and the text code. Officials add PIN 2580, then the same code. A member can save a 4-digit PIN afterwards.
      </p>

      <section id="price" className="mt-14">
        <h2 className="font-serif text-3xl">What a chama pays</h2>
        <p className="mt-2 max-w-2xl text-stone-700">
          Standard is the higher of KES 500 and KES 30 an active member. Pro is the higher of KES 1,000 and KES 60. Umoja&apos;s {EXAMPLE_MEMBERS} active members are {standard} on Standard and {pro} on Pro.
        </p>
      </section>
    </main>
  );
}
