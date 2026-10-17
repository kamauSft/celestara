export type OfficialRole = "CHAIR" | "TREASURER" | "SECRETARY" | "MEMBER" | "AUDITOR";

export interface LoanApprovalInput {
  amountCents: number;
  limitCents: number;
  requesterMembershipId: string;
  borrowerMembershipId: string;
  borrowerIsTreasurer: boolean;
  approvals: { membershipId: string; role: OfficialRole }[];
}

function hasRole(
  approvals: { membershipId: string; role: OfficialRole }[],
  role: OfficialRole,
): boolean {
  return approvals.some((approval) => approval.role === role);
}

/**
 * The treasurer can approve another member's loan up to the chama limit.
 * Above that, the chair must approve as well. Nobody can approve their own request,
 * and the borrower cannot be an approver. When the treasurer is the borrower, the
 * chair stands in, and a secretary joins them above the limit.
 */
export function loanApprovalsSatisfied(input: LoanApprovalInput): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.approvals.some((approval) => approval.membershipId === input.requesterMembershipId)) {
    reasons.push("REQUESTER_CANNOT_APPROVE");
  }
  if (input.approvals.some((approval) => approval.membershipId === input.borrowerMembershipId)) {
    reasons.push("BORROWER_CANNOT_APPROVE");
  }

  const valid = input.approvals.filter(
    (approval) =>
      approval.membershipId !== input.requesterMembershipId &&
      approval.membershipId !== input.borrowerMembershipId,
  );
  const aboveLimit = input.amountCents > input.limitCents;
  let ok = false;
  if (!aboveLimit) {
    if (hasRole(valid, "TREASURER") || (input.borrowerIsTreasurer && hasRole(valid, "CHAIR"))) {
      ok = true;
    } else {
      reasons.push("NEEDS_TREASURER");
    }
  } else if (hasRole(valid, "TREASURER") && hasRole(valid, "CHAIR")) {
    ok = true;
  } else if (input.borrowerIsTreasurer && hasRole(valid, "CHAIR") && hasRole(valid, "SECRETARY")) {
    ok = true;
  } else {
    reasons.push("NEEDS_TREASURER_AND_CHAIR");
  }

  return { ok, reasons };
}
