"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ChamaChoice {
  chamaId: string;
  chamaName: string;
  role: string;
}

interface LoginBody {
  status?: string;
  role?: string;
  message?: string;
  challengeId?: string;
  demoCode?: string;
  chamas?: ChamaChoice[];
}

export function LoginForm({
  initialPhone = "",
  initialPin = "",
  startWithPin = false,
}: {
  initialPhone?: string;
  initialPin?: string;
  startWithPin?: boolean;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone);
  const [pin, setPin] = useState(initialPin);
  const [showPin, setShowPin] = useState(startWithPin);
  const [chamaId, setChamaId] = useState("");
  const [choices, setChoices] = useState<ChamaChoice[]>([]);
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function goHome(role?: string) {
    router.push(role && role !== "MEMBER" ? "/desk" : "/home");
    router.refresh();
  }

  async function submitPhone(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, pin: showPin ? pin : undefined, chamaId: chamaId || undefined }),
      });
      const body = (await response.json().catch(() => null)) as LoginBody | null;
      if (!body?.status) {
        setMessage("Sign-in could not be completed. Try again.");
        return;
      }
      if (body.status === "authenticated") {
        goHome(body.role);
        return;
      }
      if (body.status === "choose_chama") {
        setChoices(body.chamas ?? []);
        setMessage("Choose which chama to open.");
        return;
      }
      if (body.status === "pin_required") {
        setShowPin(true);
        setMessage(body.message || "Enter your PIN. Officials also confirm with a text message.");
        return;
      }
      if (body.status === "otp_required") {
        setChallengeId(body.challengeId ?? "");
        setDemoCode(body.demoCode ?? "");
        setMessage(
          body.demoCode
            ? "Enter the text code. Demo mode shows it on this page."
            : "Enter the text code sent to your phone.",
        );
        return;
      }
      setMessage(body.message || "That phone or PIN was not recognised.");
    } catch {
      setMessage("Sign-in could not be completed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, code }),
      });
      const body = (await response.json().catch(() => null)) as LoginBody | null;
      if (!body?.status) {
        setMessage("Sign-in could not be completed. Try again.");
        return;
      }
      if (body.status === "authenticated") {
        goHome(body.role);
        return;
      }
      setMessage(
        body.message || (body.status === "otp_expired" ? "That code has expired." : "That code was not accepted."),
      );
    } catch {
      setMessage("Sign-in could not be completed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-3xl border border-stone-300 bg-white/80 p-6 shadow-sm">
      <form onSubmit={challengeId ? submitCode : submitPhone} className="space-y-4">
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
                name="phone"
              />
            </label>
            {showPin ? (
              <label className="block text-sm font-medium">
                PIN
                <input
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  name="pin"
                />
              </label>
            ) : null}
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
              autoComplete="one-time-code"
              name="code"
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
      {!challengeId && !startWithPin ? (
        <button
          className="mt-3 text-sm underline"
          type="button"
          onClick={() => {
            setShowPin((current) => !current);
            setMessage("");
          }}
        >
          {showPin ? "Use a text code instead" : "Use a PIN instead"}
        </button>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-clay" role="alert" data-testid="login-error">
          {message}
        </p>
      ) : null}
      {demoCode ? (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-stone-700" data-testid="demo-banner">
          <p className="font-semibold">Demo mode</p>
          <p className="mt-1">
            Text message code: <strong data-testid="demo-code">{demoCode}</strong>
          </p>
          <button className="mt-2 underline" type="button" onClick={() => setCode(demoCode)}>
            Use demo code
          </button>
        </div>
      ) : null}
    </div>
  );
}
