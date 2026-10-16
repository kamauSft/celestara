import { PrismaClient } from "@prisma/client";
import { currentTenant, type TenantContext } from "./tenancy/context";
import { forTenant } from "./tenancy/extension";

const globalForPrisma = globalThis as unknown as { prismaRaw?: PrismaClient };

export const prismaRaw = globalForPrisma.prismaRaw ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaRaw = prismaRaw;
}

/** Capture the active chama before Prisma's query pipeline drops async context. */
export function getDb(context: TenantContext | undefined = currentTenant()) {
  return forTenant(prismaRaw, context);
}
