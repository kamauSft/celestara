import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss">Kikapu</p>
      <h1 className="mt-2 font-serif text-4xl">Sign in</h1>
      <p className="mt-2 text-sm text-stone-600">
        Demo PIN 2580. Member Amina is 0712345005 and lands on her position. Chair Grace is 0712345001 and treasurer Peter is 0712345002. Officials also enter the SMS code, then land on the desk.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </main>
  );
}
