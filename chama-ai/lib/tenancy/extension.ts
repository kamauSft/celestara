import { PrismaClient } from "@prisma/client";
import { TenantIsolationError, type TenantContext } from "./context";
import { AUTH_ONLY_MODELS, BILLING_MODELS, TENANT_MODELS, assertMutationAllowed } from "./models";

type QueryArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
};

const LIST_OPERATIONS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

const UNIQUE_OPERATIONS = new Set(["findUnique", "findUniqueOrThrow", "update", "delete", "upsert"]);

function delegate(base: PrismaClient, model: string) {
  const key = model.charAt(0).toLowerCase() + model.slice(1);
  return (base as unknown as Record<string, { findUnique: (args: { where: Record<string, unknown> }) => Promise<{ id?: string; chamaId?: string } | null> }>)[key];
}

function withChama(where: Record<string, unknown> | undefined, chamaId: string) {
  return { AND: [where ?? {}, { chamaId }] };
}

function stampChamaId(data: Record<string, unknown>, chamaId: string) {
  if (typeof data.chamaId === "string" && data.chamaId !== chamaId) {
    throw new TenantIsolationError("Refusing a write for a different chama");
  }
  data.chamaId = chamaId;
}

export function forTenant(base: PrismaClient, context: TenantContext | undefined) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (AUTH_ONLY_MODELS.has(model)) {
            throw new TenantIsolationError(`${model} queries must use the auth client`);
          }
          const typed = args as QueryArgs;

          if (model === "Chama") {
            return guardChama(base, context, operation, typed, query);
          }
          if (model === "Person") {
            return guardPerson(context, operation, query, args);
          }
          if (!TENANT_MODELS.has(model)) {
            return query(args);
          }
          if (!context) {
            throw new TenantIsolationError(`Tenant context required for ${model}.${operation}`);
          }
          if (context.bypass) return query(args);
          if (context.isSuperAdmin && !context.chamaId && BILLING_MODELS.has(model)) {
            return query(args);
          }
          if (context.isSuperAdmin && !context.supportAccess) {
            throw new TenantIsolationError("Super admin needs time-limited support access for chama records");
          }
          if (!context.chamaId) {
            throw new TenantIsolationError(`Missing chama in tenant context for ${model}.${operation}`);
          }
          return scopeToChama(base, model, operation, typed, query, args, context.chamaId);
        },
      },
    },
  });
}

async function guardChama(
  base: PrismaClient,
  context: TenantContext | undefined,
  operation: string,
  args: QueryArgs,
  query: (args: unknown) => Promise<unknown>,
) {
  if (operation === "create" || context?.bypass) return query(args);
  if (context?.isSuperAdmin && !context.chamaId) return query(args);
  if (!context?.chamaId) {
    throw new TenantIsolationError("Tenant context required for Chama");
  }
  if (LIST_OPERATIONS.has(operation)) {
    args.where = { AND: [args.where ?? {}, { id: context.chamaId }] };
    return query(args);
  }
  if (UNIQUE_OPERATIONS.has(operation)) {
    const existing = await base.chama.findUnique({ where: args.where as { id: string } });
    if (!existing || existing.id !== context.chamaId) {
      if (operation === "findUnique" || operation === "findFirst") return null;
      throw new TenantIsolationError("Chama is outside the active tenant");
    }
  }
  return query(args);
}

function guardPerson(
  context: TenantContext | undefined,
  operation: string,
  query: (args: unknown) => Promise<unknown>,
  args: unknown,
) {
  if (context?.bypass || (context?.isSuperAdmin && !context.chamaId)) return query(args);
  if (operation === "findMany") {
    throw new TenantIsolationError("Listing people requires a platform admin context");
  }
  return query(args);
}

async function scopeToChama(
  base: PrismaClient,
  model: string,
  operation: string,
  args: QueryArgs,
  query: (args: unknown) => Promise<unknown>,
  rawArgs: unknown,
  chamaId: string,
) {
  if (operation === "create") {
    if (!args.data || Array.isArray(args.data)) {
      throw new TenantIsolationError("A create needs a single data object");
    }
    stampChamaId(args.data, chamaId);
    return query(rawArgs);
  }
  if (operation === "createMany") {
    const rows = Array.isArray(args.data) ? args.data : [];
    for (const row of rows) stampChamaId(row, chamaId);
    return query(rawArgs);
  }
  if (LIST_OPERATIONS.has(operation)) {
    args.where = withChama(args.where, chamaId);
    if (args.data && !Array.isArray(args.data) && "chamaId" in args.data) {
      stampChamaId(args.data, chamaId);
    }
    assertMutationAllowed(model, operation);
    return query(rawArgs);
  }
  if (UNIQUE_OPERATIONS.has(operation)) {
    const existing = await delegate(base, model).findUnique({ where: args.where ?? {} });
    if (!existing || existing.chamaId !== chamaId) {
      if (operation === "findUnique" || operation === "findFirst") return null;
      throw new TenantIsolationError(`${model} is not in this chama`);
    }
    if (args.data && !Array.isArray(args.data) && "chamaId" in args.data) {
      stampChamaId(args.data, chamaId);
    }
    assertMutationAllowed(model, operation);
    return query(rawArgs);
  }
  return query(rawArgs);
}
