export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="rounded-2xl border border-stone-300 bg-white/80 p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </article>
  );
}
