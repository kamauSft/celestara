import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, type ActiveSession } from "../auth/service";
import { SESSION_COOKIE } from "../auth/session";
import { isOfficial, type TenantContext } from "../tenancy/context";

export async function requireSession(): Promise<ActiveSession> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const session = token ? await getSession(token) : null;
  if (!session) redirect("/login");
  return session;
}

export function tenantFromSession(session: ActiveSession): TenantContext {
  return {
    chamaId: session.chamaId,
    membershipId: session.membershipId,
    personId: session.personId,
    role: session.role,
  };
}

export function homeForRole(role: ActiveSession["role"]): string {
  return isOfficial(role) ? "/desk" : "/home";
}
