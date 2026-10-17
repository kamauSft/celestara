import { Shell } from "@/components/shell";
import { Stat } from "@/components/stat";
import { booksAsOf } from "@/lib/chama/clock";
import { loadValueStory } from "@/lib/chama/load-desk";
import { requireSession, tenantFromSession } from "@/lib/chama/page-session";
import { isOfficial, runWithTenant } from "@/lib/tenancy/context";

export const dynamic = "force-dynamic";

export default async function ValuePage() {
  const session = await requireSession();
  const story = await runWithTenant(tenantFromSession(session), () => loadValueStory(booksAsOf()));
  const official = isOfficial(session.role);

  return (
    <Shell chamaName={story.chamaName} personName={session.personName} role={session.role} current="/value">
      <h1 className="font-serif text-4xl">{official ? "Why the group pays" : "What Kikapu did"}</h1>
      <p className="mt-2 max-w-2xl text-stone-700">
        Through {story.latestPeriod}, on-time contributions are {story.onTimeLabel}, from {story.beforeLabel} before the desk.
        That is {story.minutesSaved.toLocaleString("en-KE")} minutes the officials did not spend chasing the register.
      </p>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Minutes handed back" value={story.minutesSaved.toLocaleString("en-KE")} />
        <Stat label="Reminders sent" value={String(story.remindersSent)} />
        <Stat label="Questions answered" value={String(story.questionsAnswered)} />
        <Stat label="Payments recorded" value={String(story.paymentsRecorded)} />
        <Stat label="Statements issued" value={String(story.statementsIssued)} />
        <Stat label="Arrears recovered" value={story.arrearsRecoveredLabel} />
      </section>
      {official ? (
        <section className="mt-8 rounded-3xl border border-moss bg-white/80 p-5">
          <h2 className="font-serif text-2xl">This month&apos;s quote</h2>
          <p className="mt-2 text-sm text-stone-700">
            {story.activeMembers} active members. Standard {story.standardLabel}. Pro {story.proLabel}. The higher of the floor and the per-member rate.
          </p>
        </section>
      ) : (
        <p className="mt-8 text-sm text-stone-600">Your own figures stay on My position. This page is the group&apos;s time, not another member&apos;s balance.</p>
      )}
    </Shell>
  );
}
