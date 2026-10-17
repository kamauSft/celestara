import { prismaRaw } from "@/lib/db";

export async function resetDatabase() {
  await prismaRaw.vote.deleteMany();
  await prismaRaw.poll.deleteMany();
  await prismaRaw.loanRepayment.deleteMany();
  await prismaRaw.loanInstallment.deleteMany();
  await prismaRaw.guarantor.deleteMany();
  await prismaRaw.approval.deleteMany();
  await prismaRaw.fine.deleteMany();
  await prismaRaw.contribution.deleteMany();
  await prismaRaw.loan.deleteMany();
  await prismaRaw.expense.deleteMany();
  await prismaRaw.welfareClaim.deleteMany();
  await prismaRaw.savingsGoal.deleteMany();
  await prismaRaw.mpesaTransaction.deleteMany();
  await prismaRaw.meeting.deleteMany();
  await prismaRaw.notification.deleteMany();
  await prismaRaw.message.deleteMany();
  await prismaRaw.agentRun.deleteMany();
  await prismaRaw.valueMetric.deleteMany();
  await prismaRaw.usageCounter.deleteMany();
  await prismaRaw.invoice.deleteMany();
  await prismaRaw.subscription.deleteMany();
  await prismaRaw.pendingAction.deleteMany();
  await prismaRaw.supportAccess.deleteMany();
  await prismaRaw.auditLog.deleteMany();
  await prismaRaw.otpChallenge.deleteMany();
  await prismaRaw.session.deleteMany();
  await prismaRaw.membership.deleteMany();
  await prismaRaw.person.deleteMany();
  await prismaRaw.chama.deleteMany();
}
