"use client";

import { useRouter } from "next/navigation";

export function SignOut() {
  const router = useRouter();

  async function signOut(all: boolean) {
    await fetch(all ? "/api/auth/logout-all" : "/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex gap-3">
      <button className="rounded-full border border-stone-400 px-4 py-2 text-sm" onClick={() => signOut(false)} type="button">
        Sign out
      </button>
      <button className="rounded-full border border-stone-400 px-4 py-2 text-sm" onClick={() => signOut(true)} type="button">
        Sign out everywhere
      </button>
    </div>
  );
}
