import { AsyncLocalStorage } from "node:async_hooks";

export type MembershipRoleName = "CHAIR" | "TREASURER" | "SECRETARY" | "MEMBER" | "AUDITOR";

export interface TenantContext {
  chamaId?: string;
  membershipId?: string;
  personId?: string;
  role?: MembershipRoleName;
  isSuperAdmin?: boolean;
  supportAccess?: boolean;
  /** System jobs such as seeding. Application requests must not set this. */
  bypass?: boolean;
}

const storage = new AsyncLocalStorage<TenantContext>();

export function currentTenant(): TenantContext | undefined {
  return storage.getStore();
}

export function runWithTenant<T>(context: TenantContext, fn: () => T): T {
  return storage.run(context, fn);
}

const OFFICIALS = new Set<MembershipRoleName>(["CHAIR", "TREASURER", "SECRETARY", "AUDITOR"]);

export class TenantIsolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantIsolationError";
  }
}

export function assertCanReadMembership(targetMembershipId: string): void {
  const context = currentTenant();
  if (!context || context.bypass) return;
  if (context.isSuperAdmin && context.supportAccess) return;
  if (context.role && OFFICIALS.has(context.role)) return;
  if (context.membershipId !== targetMembershipId) {
    throw new TenantIsolationError("Members can only read their own records");
  }
}
