"use client";

import { useState } from "react";

export function MemberPinForm() {
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      setMessage(body?.ok ? "PIN saved. Next time, choose Use a PIN instead." : body?.message || "Could not save the PIN.");
    } catch {
      setMessage("Could not save the PIN.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl border border-stone-300 bg-white/80 p-4">
      <h2 className="font-serif text-2xl">Set a 4-digit PIN</h2>
      <p className="mt-1 text-sm text-stone-600">
        Optional. Save it on this phone so the next sign-in can skip the text code.
      </p>
      <label className="mt-3 block text-sm font-medium">
        4-digit PIN
        <input
          className="mt-1 w-full max-w-xs rounded-xl border border-stone-300 px-3 py-3 tracking-[0.3em]"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          autoComplete="new-password"
          name="member-pin"
        />
      </label>
      <button
        className="mt-3 rounded-full bg-moss px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        disabled={pending || pin.length !== 4}
        type="submit"
      >
        {pending ? "Saving…" : "Save PIN"}
      </button>
      {message ? (
        <p className="mt-3 text-sm text-stone-700" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
