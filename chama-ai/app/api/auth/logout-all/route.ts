import { cookies } from "next/headers";
import { getSession, logoutAll } from "@/lib/auth/service";
import { clearSessionCookie } from "@/lib/auth/http";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const session = token ? await getSession(token) : null;
  if (session) await logoutAll(session.personId);
  await clearSessionCookie();
  return Response.json({ status: "signed_out" });
}
