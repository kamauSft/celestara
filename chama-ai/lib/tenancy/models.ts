export const TENANT_MODELS = new Set([
  "Membership",
  "Contribution",
  "Loan",
  "LoanInstallment",
  "LoanRepayment",
  "Guarantor",
  "Fine",
  "Expense",
  "WelfareClaim",
  "Meeting",
  "Poll",
  "Vote",
  "SavingsGoal",
  "MpesaTransaction",
  "Approval",
  "AuditLog",
  "AgentRun",
  "Message",
  "Notification",
  "Subscription",
  "Invoice",
  "UsageCounter",
  "ValueMetric",
  "PendingAction",
  "SupportAccess",
]);

/** Billing rows are visible to the platform owner without opening a chama's books. */
export const BILLING_MODELS = new Set(["Subscription", "Invoice", "UsageCounter"]);

/** Corrections are new reversal rows. These records cannot be edited. */
export const IMMUTABLE_MODELS = new Set(["Contribution", "LoanRepayment", "Expense", "AuditLog"]);

/** Financial history cannot be hard-deleted. */
export const NO_DELETE_MODELS = new Set([
  "Contribution",
  "Loan",
  "LoanInstallment",
  "LoanRepayment",
  "Guarantor",
  "Fine",
  "Expense",
  "WelfareClaim",
  "AuditLog",
]);

export const AUTH_ONLY_MODELS = new Set(["Session", "OtpChallenge"]);

export class ImmutabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImmutabilityError";
  }
}

export function assertMutationAllowed(model: string, operation: string): void {
  if ((operation === "delete" || operation === "deleteMany") && NO_DELETE_MODELS.has(model)) {
    throw new ImmutabilityError(`${model} records cannot be deleted`);
  }
  if (
    (operation === "update" || operation === "updateMany" || operation === "upsert") &&
    IMMUTABLE_MODELS.has(model)
  ) {
    throw new ImmutabilityError(`${model} records cannot be edited`);
  }
}
