import { LoginForm } from "@/components/login-form";

const WHO = {
  treasurer: {
    title: "Treasurer",
    copy: "Peter Otieno, treasurer of Umoja. PIN 2580. The next screen shows the SMS code. After it, you are in the treasurer's books: every member, this month, and the receipts still unmatched.",
    phone: "0712345002",
  },
  member: {
    title: "Member",
    copy: "Amina Hassan, member of Umoja. PIN 2580. No SMS code. You see only her savings, her loan, her months, and her statement.",
    phone: "0712345005",
  },
  chair: {
    title: "Chair",
    copy: "Grace Wanjiku, chair of Umoja. PIN 2580, then the SMS code. The chair opens the same treasurer's books.",
    phone: "0712345001",
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
          "Demo PIN 2580. Open as the treasurer on 0712345002, or as the member Amina on 0712345005."}
      </p>
      <div className="mt-6">
        <LoginForm initialPhone={who?.phone ?? "0712345005"} />
      </div>
    </main>
  );
}
