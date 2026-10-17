import { cookies } from "next/headers";
import { getSession, setMemberPin } from "@/lib/auth/service";
import { limitAuth } from "@/lib/auth/http";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  const limit = limitAuth(request, "pin");
  if (!limit.ok) {
    return Response.json({ ok: false, message: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const session = token ? await getSession(token) : null;
  if (!session) return Response.json({ ok: false, message: "Sign in first." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { pin?: string } | null;
  const result = await setMemberPin({
    membershipId: session.membershipId,
    personId: session.personId,
    pin: body?.pin ?? "",
  });
  if (!result.ok) return Response.json(result, { status: 400 });
  return Response.json(result);
}
