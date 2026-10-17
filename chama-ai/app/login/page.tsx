import { LoginForm } from "@/components/login-form";

const WHO = {
  treasurer: {
    title: "Treasurer",
    copy: "Peter Otieno, treasurer of Umoja. Number, PIN 2580, then the text code on this page. After it, you are in the treasurer's books.",
    phone: "0712345002",
    pin: "2580",
  },
  member: {
    title: "Member",
    copy: "Amina Hassan, member of Umoja. Enter her number. The text code appears on this page in demo mode. She sees only her own money. Use a PIN instead, with 2580, to skip the code.",
    phone: "0712345005",
    pin: "",
  },
  chair: {
    title: "Chair",
    copy: "Grace Wanjiku, chair of Umoja. Number, PIN 2580, then the text code. The chair opens the same treasurer's books.",
    phone: "0712345001",
    pin: "2580",
  },
} as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string }>;
}) {
  const query = await searchParams;
  const who = query.who === "treasurer" || query.who === "member" || query.who === "chair" ? WHO[query.who] : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss">Kikapu</p>
      <h1 className="mt-2 font-serif text-4xl">{who?.title ?? "Sign in"}</h1>
      <p className="mt-2 text-sm text-stone-600">
        {who?.copy ??
          "Members enter a phone number and the text code. Officials also enter PIN 2580. Amina is 0712345005. Peter is 0712345002."}
      </p>
      <div className="mt-6">
        <LoginForm initialPhone={who?.phone ?? "0712345005"} initialPin={who?.pin ?? ""} startWithPin={Boolean(who?.pin)} />
      </div>
    </main>
  );
}
