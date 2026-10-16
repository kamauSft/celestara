"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ChamaChoice {
  chamaId: string;
  chamaName: string;
  role: string;
}

export function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("0712345005");
  const [pin, setPin] = useState("2580");
  const [chamaId, setChamaId] = useState("");
  const [choices, setChoices] = useState<ChamaChoice[]>([]);
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submitPin(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone, pin, chamaId: chamaId || undefined }),
    });
    const body = await response.json();
    setPending(false);
    if (body.status === "authenticated") {
      router.push("/home");
      router.refresh();
      return;
    }
    if (body.status === "choose_chama") {
      setChoices(body.chamas);
      setMessage("Choose which chama to open.");
      return;
    }
    if (body.status === "otp_required") {
      setChallengeId(body.challengeId);
      setDemoCode(body.demoCode ?? "");
      setMessage("Enter the SMS code.");
      return;
    }
    if (body.status === "locked") {
      setMessage("Too many attempts. Try again in 15 minutes.");
      return;
    }
    setMessage("That phone or PIN was not recognised.");
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const response = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ challengeId, code }),
    });
    const body = await response.json();
    setPending(false);
    if (body.status === "authenticated") {
      router.push("/home");
      router.refresh();
      return;
    }
    setMessage(body.status === "otp_expired" ? "That code has expired." : "That code was not accepted.");
  }

  return (
    <div className="rounded-3xl border border-stone-300 bg-white/80 p-6 shadow-sm">
      <form onSubmit={challengeId ? submitCode : submitPin} className="space-y-4">
        {!challengeId ? (
          <>
            <label className="block text-sm font-medium">
              Phone
              <input
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
            <label className="block text-sm font-medium">
              PIN
              <input
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
              />
            </label>
            {choices.length > 0 ? (
              <label className="block text-sm font-medium">
                Chama
                <select
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3"
                  value={chamaId}
                  onChange={(event) => setChamaId(event.target.value)}
                >
                  <option value="">Select</option>
                  {choices.map((choice) => (
                    <option key={choice.chamaId} value={choice.chamaId}>
                      {choice.chamaName} · {choice.role}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </>
        ) : (
          <label className="block text-sm font-medium">
            SMS code
            <input
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3 tracking-[0.3em]"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
            />
          </label>
        )}
        <button
          className="w-full rounded-full bg-moss px-4 py-3 font-semibold text-white disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Checking…" : challengeId ? "Confirm code" : "Continue"}
        </button>
      </form>
      {message ? <p className="mt-4 text-sm text-clay">{message}</p> : null}
      {demoCode ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-stone-700">
          Demo code, shown only while DEMO_OTP_VISIBLE is on: {demoCode}
        </p>
      ) : null}
    </div>
  );
}
