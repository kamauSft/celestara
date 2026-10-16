import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss">Chama AI</p>
      <h1 className="mt-3 font-serif text-5xl leading-tight text-ink">The group&apos;s books, with a person at the till.</h1>
      <p className="mt-4 max-w-xl text-lg text-stone-700">
        Umoja Savings Group is loaded for this demo. Money maths stays in tested code. Phase 1 signs you in and shows your own position.
      </p>
      <Link
        href="/login"
        className="mt-8 w-fit rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white"
      >
        Sign in
      </Link>
    </main>
  );
}
