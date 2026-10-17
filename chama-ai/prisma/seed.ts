import "./load-env";
import type { MembershipRole } from "@prisma/client";
import { appendAuditLog } from "../lib/audit/log";
import { hashPin } from "../lib/auth/pin";
import { normalizePhone } from "../lib/phone";

function requirePhone(input: string): string {
  const phone = normalizePhone(input);
  if (!phone) throw new Error(`Seed phone is not a Kenyan mobile number: ${input}`);
  return phone;
}
import { umojaSettings } from "../lib/chama/rules";
import { prismaRaw } from "../lib/db";
import { shiftPeriod } from "../lib/finance/dates";
import { divRound } from "../lib/finance/money";
import { runWithTenant } from "../lib/tenancy/context";
import {
  DEMO_PIN,
  SEED_AS_OF,
  agentRuns,
  buildContributions,
  expenses,
  loanRows,
  loans,
  meetingAbsences,
  meetingDates,
  members,
  mpesaQueue,
  periodsOwed,
  polls,
  savingsCentsAt,
  welfare,
} from "./seed-data";

const prisma = prismaRaw;

export async function seedDatabase() {
  await prisma.vote.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.loanRepayment.deleteMany();
  await prisma.loanInstallment.deleteMany();
  await prisma.guarantor.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.fine.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.welfareClaim.deleteMany();
  await prisma.savingsGoal.deleteMany();
  await prisma.mpesaTransaction.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.valueMetric.deleteMany();
  await prisma.usageCounter.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.pendingAction.deleteMany();
  await prisma.supportAccess.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.otpChallenge.deleteMany();
  await prisma.session.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.person.deleteMany();
  await prisma.chama.deleteMany();

  const pinHash = await hashPin(DEMO_PIN);
  const { contributions, fines } = buildContributions();
  const chama = await prisma.chama.create({
    data: {
      name: "Umoja Savings Group",
      registrationNo: "CG/NRB/2025/0142",
      county: "Nairobi",
      currency: "KES",
      settings: umojaSettings,
      plan: "PRO",
      status: "ACTIVE",
      trialEndsAt: new Date("2025-05-31T00:00:00.000Z"),
      createdAt: new Date("2025-05-01T00:00:00.000Z"),
    },
  });

  const personByMember = new Map<string, { personId: string; membershipId: string }>();
  for (const member of members) {
    const person = await prisma.person.create({
      data: {
        name: member.name,
        phone: requirePhone(member.phone),
        preferredLanguage: member.language,
        channelPrefs: { whatsapp: true, sms: true, ussd: false },
        consent: {
          privacyNotice: true,
          whatsapp: true,
          sms: true,
          dataProcessing: true,
          consentedAt: member.joinDate,
        },
      },
    });
    const membership = await prisma.membership.create({
      data: {
        chamaId: chama.id,
        personId: person.id,
        role: member.role as MembershipRole,
        memberNo: member.memberNo,
        joinDate: new Date(`${member.joinDate}T00:00:00.000Z`),
        exitDate: member.exitDate ? new Date(`${member.exitDate}T00:00:00.000Z`) : null,
        status: member.exitDate ? "EXITED" : "ACTIVE",
        hashedPin: pinHash,
      },
    });
    personByMember.set(member.memberNo, { personId: person.id, membershipId: membership.id });
  }

  const idOf = (memberNo: string) => {
    const found = personByMember.get(memberNo);
    if (!found) throw new Error(`Missing member ${memberNo}`);
    return found.membershipId;
  };

  for (const contribution of contributions) {
    await prisma.contribution.create({
      data: {
        chamaId: chama.id,
        membershipId: idOf(contribution.memberNo),
        amountCents: contribution.amountCents,
        period: contribution.period,
        datePaid: new Date(`${contribution.datePaid}T00:00:00.000Z`),
        method: contribution.method,
        reference: contribution.reference,
        source: contribution.method === "MPESA" ? "MPESA" : "IMPORT",
      },
    });
  }

  for (const fine of fines) {
    await prisma.fine.create({
      data: {
        chamaId: chama.id,
        membershipId: idOf(fine.memberNo),
        type: fine.type,
        amountCents: fine.amountCents,
        date: new Date(`${fine.date}T00:00:00.000Z`),
        status: "UNPAID",
        reason: fine.reason,
      },
    });
  }

  for (const absence of meetingAbsences) {
    await prisma.fine.create({
      data: {
        chamaId: chama.id,
        membershipId: idOf(absence.memberNo),
        type: "MISSED_MEETING",
        amountCents: umojaSettings.missedMeetingFineCents,
        date: new Date(`${absence.date}T00:00:00.000Z`),
        status: "UNPAID",
        reason: "Missed the monthly meeting",
      },
    });
  }

  for (const spec of loans) {
    const schedule = loanRows(spec);
    const loan = await prisma.loan.create({
      data: {
        chamaId: chama.id,
        membershipId: idOf(spec.memberNo),
        principalCents: spec.principalCents,
        rateBps: umojaSettings.loanInterestRateBps,
        interestType: "FLAT",
        months: spec.months,
        purpose: spec.purpose,
        status: spec.outcome,
        applicationDate: new Date(`${spec.applicationDate}T00:00:00.000Z`),
        issueDate: spec.issueDate ? new Date(`${spec.issueDate}T00:00:00.000Z`) : null,
        dueDate: schedule.length ? new Date(`${schedule[schedule.length - 1].dueDate}T00:00:00.000Z`) : null,
      },
    });
    for (const [index, installment] of schedule.entries()) {
      const paid = index < spec.installmentsToPay;
      const overdue = !paid && installment.dueDate < SEED_AS_OF;
      await prisma.loanInstallment.create({
        data: {
          chamaId: chama.id,
          loanId: loan.id,
          dueDate: new Date(`${installment.dueDate}T00:00:00.000Z`),
          principalDueCents: installment.principalDueCents,
          interestDueCents: installment.interestDueCents,
          paidAmountCents: paid ? installment.totalDueCents : 0,
          status: paid ? "PAID" : overdue ? "OVERDUE" : "SCHEDULED",
        },
      });
      if (paid) {
        await prisma.loanRepayment.create({
          data: {
            chamaId: chama.id,
            loanId: loan.id,
            amountCents: installment.totalDueCents,
            datePaid: new Date(`${installment.dueDate}T00:00:00.000Z`),
            method: "MPESA",
            reference: `LN${spec.memberNo}${index + 1}`,
            source: "IMPORT",
          },
        });
      } else if (overdue) {
        const fine = Number(
          divRound(BigInt(installment.totalDueCents) * BigInt(umojaSettings.lateInstallmentFineRateBps), 10_000n),
        );
        await prisma.fine.create({
          data: {
            chamaId: chama.id,
            membershipId: idOf(spec.memberNo),
            type: "LATE_INSTALLMENT",
            amountCents: fine,
            date: new Date(`${installment.dueDate}T00:00:00.000Z`),
            status: "UNPAID",
            reason: `Late installment due ${installment.dueDate}`,
          },
        });
      }
    }
    for (const guarantor of spec.guarantors ?? []) {
      await prisma.guarantor.create({
        data: {
          chamaId: chama.id,
          loanId: loan.id,
          guarantorMembershipId: idOf(guarantor.memberNo),
          amountGuaranteedCents: guarantor.amountCents,
          status: "ACCEPTED",
        },
      });
    }
    const borrowerIsTreasurer = spec.memberNo === "M002";
    const approvers = spec.outcome === "REJECTED"
      ? ["M002"]
      : borrowerIsTreasurer
        ? spec.principalCents > umojaSettings.treasurerApprovalLimitCents
          ? ["M001", "M003"]
          : ["M001"]
        : spec.principalCents > umojaSettings.treasurerApprovalLimitCents
          ? ["M002", "M001"]
          : ["M002"];
    for (const approver of approvers) {
      await prisma.approval.create({
        data: {
          chamaId: chama.id,
          entityType: "LOAN",
          entityId: loan.id,
          requestedByMembershipId: idOf(spec.memberNo),
          approvedByMembershipId: idOf(approver),
          status: spec.outcome === "REJECTED" ? "REJECTED" : "APPROVED",
          decidedAt: new Date(`${spec.issueDate ?? spec.applicationDate}T00:00:00.000Z`),
        },
      });
    }
  }

  for (const expense of expenses) {
    await prisma.expense.create({
      data: {
        chamaId: chama.id,
        amountCents: expense.amountCents,
        description: expense.description,
        date: new Date(`${expense.date}T00:00:00.000Z`),
        method: expense.method,
        source: "MANUAL",
      },
    });
  }
  for (const claim of welfare) {
    const row = await prisma.welfareClaim.create({
      data: {
        chamaId: chama.id,
        membershipId: idOf(claim.memberNo),
        type: claim.type,
        amountCents: claim.amountCents,
        description: claim.description,
        status: "PAID",
        date: new Date(`${claim.date}T00:00:00.000Z`),
      },
    });
    for (const approver of ["M002", "M001"]) {
      await prisma.approval.create({
        data: {
          chamaId: chama.id,
          entityType: "WELFARE",
          entityId: row.id,
          requestedByMembershipId: idOf("M003"),
          approvedByMembershipId: idOf(approver),
          status: "APPROVED",
          decidedAt: new Date(`${claim.date}T00:00:00.000Z`),
        },
      });
    }
  }

  for (const date of meetingDates()) {
    const absent = new Set(meetingAbsences.filter((row) => row.date === date).map((row) => row.memberNo));
    const attendance = members
      .filter((member) => periodsOwed({ ...member, missedPeriods: [] }, date).length > 0 || member.joinDate <= date)
      .filter((member) => !member.exitDate || member.exitDate >= date)
      .map((member) => ({ memberNo: member.memberNo, present: !absent.has(member.memberNo) }));
    await prisma.meeting.create({
      data: {
        chamaId: chama.id,
        date: new Date(`${date}T00:00:00.000Z`),
        agenda: "Contributions, loan applications, and any welfare request.",
        attendance,
        minutes: `Members met on ${date}. The treasurer read the balances and the chair confirmed the arrears follow-up.`,
        decisions: [{ text: "Late contributions remain KES 200, due by the 5th." }],
      },
    });
  }

  for (const poll of polls) {
    const row = await prisma.poll.create({
      data: {
        chamaId: chama.id,
        question: poll.question,
        status: "CLOSED",
        quorumBps: 5_000,
        opensAt: new Date(`${poll.opensAt}T00:00:00.000Z`),
        closesAt: new Date(`${poll.closesAt}T00:00:00.000Z`),
      },
    });
    for (const memberNo of poll.yes) {
      await prisma.vote.create({
        data: { chamaId: chama.id, pollId: row.id, membershipId: idOf(memberNo), choice: "YES" },
      });
    }
    for (const memberNo of poll.no) {
      await prisma.vote.create({
        data: { chamaId: chama.id, pollId: row.id, membershipId: idOf(memberNo), choice: "NO" },
      });
    }
  }

  await prisma.savingsGoal.create({
    data: {
      chamaId: chama.id,
      membershipId: idOf("M005"),
      title: "Plot deposit",
      targetCents: 5_000_000,
      targetDate: new Date("2027-12-01T00:00:00.000Z"),
    },
  });

  for (const row of mpesaQueue) {
    await prisma.mpesaTransaction.create({
      data: {
        chamaId: chama.id,
        transId: row.transId,
        rawPayload: row,
        amountCents: row.amountCents,
        phone: requirePhone(row.phone),
        billRef: row.billRef,
        status: row.status,
      },
    });
  }
  await prisma.mpesaTransaction.create({
    data: {
      chamaId: chama.id,
      transId: "QJ202610M005",
      rawPayload: { note: "Matched to Amina's October contribution" },
      amountCents: 200_000,
      phone: requirePhone("+254712345005"),
      billRef: "M005",
      matchedMembershipId: idOf("M005"),
      status: "MATCHED",
    },
  });

  for (const run of agentRuns) {
    await prisma.agentRun.create({
      data: {
        chamaId: chama.id,
        agent: run.agent,
        trigger: run.trigger,
        inputSummary: run.inputSummary,
        toolsCalled: run.tools,
        output: run.output,
        inputTokens: 400,
        outputTokens: 120,
        costCents: 50,
        status: "SUCCEEDED",
        durationMs: 800,
        createdAt: new Date("2026-10-15T09:00:00.000Z"),
      },
    });
  }

  let period = "2025-05";
  let index = 0;
  while (period <= "2026-10") {
    const active = members.filter((member) => periodsOwed(member, `${period}-28`).includes(period)).length;
    await prisma.valueMetric.create({
      data: {
        chamaId: chama.id,
        period,
        minutesSaved: active * 4,
        remindersSent: index < 3 ? 0 : active,
        questionsAnswered: 2 + index,
        paymentsRecorded: active,
        onTimeRateBps: Math.min(9_200, 7_100 + index * 120),
        onTimeRateBeforeBps: 7_100,
        arrearsRecoveredCents: index * 20_000,
        statementsIssued: active,
        reconciliationVarianceCents: index === 17 ? 200_000 : 0,
      },
    });
    period = shiftPeriod(period, 1);
    index += 1;
  }

  await prisma.subscription.create({
    data: {
      chamaId: chama.id,
      plan: "PRO",
      status: "active",
      periodStart: new Date("2026-10-01T00:00:00.000Z"),
      periodEnd: new Date("2026-11-01T00:00:00.000Z"),
    },
  });
  await prisma.invoice.create({
    data: {
      chamaId: chama.id,
      period: "2026-10",
      amountCents: 120_000,
      status: "paid",
      paidAt: new Date("2026-10-02T00:00:00.000Z"),
      reference: "SUB202610",
    },
  });
  await prisma.usageCounter.create({
    data: {
      chamaId: chama.id,
      period: "2026-10",
      aiCalls: 42,
      aiInputTokens: 18_000,
      aiOutputTokens: 4_000,
      costCents: 2_100,
      messagesSent: 80,
    },
  });
  await prisma.message.create({
    data: {
      chamaId: chama.id,
      personId: personByMember.get("M005")?.personId,
      channel: "WHATSAPP",
      direction: "INBOUND",
      content: "Salio langu ni ngapi?",
      createdAt: new Date("2026-10-14T10:00:00.000Z"),
    },
  });
  await prisma.message.create({
    data: {
      chamaId: chama.id,
      personId: personByMember.get("M005")?.personId,
      channel: "WHATSAPP",
      direction: "OUTBOUND",
      content: "Savings are on your statement. Loan and fines are listed separately.",
      agent: "Member Assistant",
      createdAt: new Date("2026-10-14T10:00:05.000Z"),
    },
  });
  await prisma.notification.create({
    data: {
      chamaId: chama.id,
      personId: personByMember.get("M002")?.personId,
      title: "M-Pesa review",
      body: "3 M-Pesa payments need a member match.",
    },
  });

  const treasurer = personByMember.get("M002");
  await runWithTenant(
    {
      chamaId: chama.id,
      membershipId: treasurer?.membershipId,
      personId: treasurer?.personId,
      role: "TREASURER",
    },
    async () => {
      await appendAuditLog({
        action: "CHAMA_SEEDED",
        entityType: "Chama",
        entityId: chama.id,
        source: "SYSTEM",
        after: { name: chama.name, members: members.length },
        createdAt: new Date("2025-05-01T08:00:00.000Z"),
      });
      await appendAuditLog({
        action: "REGISTER_IMPORTED",
        entityType: "Membership",
        entityId: chama.id,
        source: "SYSTEM",
        after: { contributions: contributions.length, loans: loans.length },
        createdAt: new Date("2025-05-01T08:05:00.000Z"),
      });
      await appendAuditLog({
        action: "RECONCILIATION_NOTED",
        entityType: "MpesaTransaction",
        entityId: chama.id,
        source: "SYSTEM",
        after: { needsReview: mpesaQueue.length },
        createdAt: new Date("2026-10-15T18:00:00.000Z"),
      });
    },
  );

  console.log("Seeded Umoja Savings Group");
  console.log(`Members: ${members.length}. Contributions: ${contributions.length}. Loans: ${loans.length}.`);
  console.log(`Demo PIN for every member: ${DEMO_PIN}`);
  console.log("Chair Grace Wanjiku: +254712345001 (SMS code required)");
  console.log("Treasurer Peter Otieno: +254712345002 (SMS code required)");
  console.log("Member Amina Hassan: +254712345005");
  console.log(`Sample savings for Amina at ${SEED_AS_OF}: ${savingsCentsAt("M005", SEED_AS_OF)} cents`);
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("seed.ts") || entry.endsWith("seed.js")) {
  seedDatabase()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
