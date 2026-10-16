import Link from "next/link";
import { monthlyPriceCents } from "@/lib/chama/picture";
import { formatKes } from "@/lib/finance";

const EXAMPLE_MEMBERS = 19;
const standard = formatKes(monthlyPriceCents("STANDARD", EXAMPLE_MEMBERS));
const pro = formatKes(monthlyPriceCents("PRO", EXAMPLE_MEMBERS));

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-moss">Kikapu</p>
      <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-tight text-ink">
        The basket that keeps a chama&apos;s money honest.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-stone-700">
        A treasurer opens the desk and sees the lending pool, who is behind, and this month&apos;s collection rate.
        A member opens their own position and a statement they can print. The maths stays in tested code.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/login" className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white">
          Open the Umoja demo
        </Link>
        <a href="#price" className="rounded-full border border-stone-400 px-5 py-3 text-sm font-semibold">
          See the price
        </a>
      </div>

      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          ["Desk", "Lending pool, collection rate, and the names that are behind this month."],
          ["Contributions", "Every member, every month, coloured paid, late, or missed."],
          ["Statement", "A member's own running balance, ready to print for the meeting."],
        ].map(([title, copy]) => (
          <article key={title} className="rounded-3xl border border-stone-300 bg-white/80 p-5">
            <h2 className="font-serif text-2xl">{title}</h2>
            <p className="mt-2 text-sm text-stone-700">{copy}</p>
          </article>
        ))}
      </section>

      <section id="price" className="mt-14">
        <h2 className="font-serif text-3xl">What a chama pays</h2>
        <p className="mt-2 max-w-2xl text-stone-700">
          Free is for trying the books. Standard is the higher of KES 500 and KES 30 an active member.
          Pro is the higher of KES 1,000 and KES 60 an active member. Umoja has {EXAMPLE_MEMBERS} active members,
          so Standard is {standard} a month and Pro is {pro}.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-3xl border border-stone-300 bg-white/80 p-5">
            <p className="text-sm uppercase tracking-wide text-stone-500">Free</p>
            <p className="mt-2 font-serif text-3xl">KES 0</p>
            <p className="mt-2 text-sm text-stone-700">Sign in and read your own position.</p>
          </article>
          <article className="rounded-3xl border border-stone-300 bg-white/80 p-5">
            <p className="text-sm uppercase tracking-wide text-stone-500">Standard</p>
            <p className="mt-2 font-serif text-3xl">{standard}</p>
            <p className="mt-2 text-sm text-stone-700">The desk, the member list, and the contribution grid.</p>
          </article>
          <article className="rounded-3xl border border-moss bg-moss p-5 text-white">
            <p className="text-sm uppercase tracking-wide text-white/80">Pro</p>
            <p className="mt-2 font-serif text-3xl">{pro}</p>
            <p className="mt-2 text-sm text-white/90">Statements, the value report, and the price of the hours given back.</p>
          </article>
        </div>
      </section>

      <section className="mt-14 rounded-3xl border border-stone-300 bg-white/80 p-6">
        <h2 className="font-serif text-3xl">Demo logins</h2>
        <p className="mt-2 text-sm text-stone-600">Umoja Savings Group, Nairobi. Every PIN is 2580. Officials also need the SMS code, which this demo shows on the sign-in screen.</p>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-stone-500">
            <tr>
              <th className="py-2 font-medium">Person</th>
              <th className="py-2 font-medium">Role</th>
              <th className="py-2 font-medium">Phone</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-stone-200">
              <td className="py-2">Grace Wanjiku Mwangi</td>
              <td>Chair</td>
              <td>0712 345 001</td>
            </tr>
            <tr className="border-t border-stone-200">
              <td className="py-2">Peter Otieno Omondi</td>
              <td>Treasurer</td>
              <td>0712 345 002</td>
            </tr>
            <tr className="border-t border-stone-200">
              <td className="py-2">Amina Hassan Bakari</td>
              <td>Member</td>
              <td>0712 345 005</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
