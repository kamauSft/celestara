import { cookies } from "next/headers";
import { logout } from "@/lib/auth/service";
import { clearSessionCookie } from "@/lib/auth/http";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await logout(token);
  await clearSessionCookie();
  return Response.json({ status: "signed_out" });
}
