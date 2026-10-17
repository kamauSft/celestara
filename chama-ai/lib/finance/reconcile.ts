import { assertCents } from "./money";

export interface ReconcileInput {
  statedBalanceCents: number;
  contributionCents: number;
  loanRepaymentCents: number;
  loanDisbursementCents: number;
  expenseCents: number;
  welfareCents: number;
  unmatchedInboundCents: number;
  unmatchedOutboundCents: number;
}

export interface ReconcileCause {
  code: "UNMATCHED_INBOUND" | "UNMATCHED_OUTBOUND" | "UNEXPLAINED";
  amountCents: number;
  explanation: string;
}

export function reconcile(input: ReconcileInput): {
  appBalanceCents: number;
  statedBalanceCents: number;
  varianceCents: number;
  likelyCauses: ReconcileCause[];
} {
  assertCents(input.statedBalanceCents, "stated balance", { allowNegative: true });
  assertCents(input.contributionCents, "contributions");
  assertCents(input.loanRepaymentCents, "repayments");
  assertCents(input.loanDisbursementCents, "disbursements");
  assertCents(input.expenseCents, "expenses");
  assertCents(input.welfareCents, "welfare");
  assertCents(input.unmatchedInboundCents, "unmatched inbound");
  assertCents(input.unmatchedOutboundCents, "unmatched outbound");

  const appBalanceCents =
    input.contributionCents +
    input.loanRepaymentCents -
    input.loanDisbursementCents -
    input.expenseCents -
    input.welfareCents;
  const varianceCents = input.statedBalanceCents - appBalanceCents;
  const likelyCauses: ReconcileCause[] = [];

  if (varianceCents > 0 && input.unmatchedInboundCents > 0) {
    likelyCauses.push({
      code: "UNMATCHED_INBOUND",
      amountCents: Math.min(varianceCents, input.unmatchedInboundCents),
      explanation: "M-Pesa receipts are not matched to members yet",
    });
  }
  if (varianceCents < 0 && input.unmatchedOutboundCents > 0) {
    likelyCauses.push({
      code: "UNMATCHED_OUTBOUND",
      amountCents: Math.min(-varianceCents, input.unmatchedOutboundCents),
      explanation: "Outgoing payments are not recorded in the books yet",
    });
  }

  const explained = likelyCauses.reduce((sum, cause) => {
    return sum + (cause.code === "UNMATCHED_OUTBOUND" ? -cause.amountCents : cause.amountCents);
  }, 0);
  if (varianceCents !== explained) {
    likelyCauses.push({
      code: "UNEXPLAINED",
      amountCents: varianceCents - explained,
      explanation: "No unmatched payment explains the rest of the difference",
    });
  }

  return {
    appBalanceCents,
    statedBalanceCents: input.statedBalanceCents,
    varianceCents,
    likelyCauses,
  };
}
