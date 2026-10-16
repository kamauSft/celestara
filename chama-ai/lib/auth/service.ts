import type { MembershipRole } from "@prisma/client";
import { prismaRaw } from "../db";
import { devMessaging, type MessagingProvider } from "../messaging/provider";
import { hashPin, verifyPin } from "./pin";
import { normalizePhone } from "../phone";
import {
  LOCKOUT_MS,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  PIN_MAX_ATTEMPTS,
  SESSION_IDLE_MS,
  newOtpCode,
  newSessionToken,
  sha256,
} from "./session";

const OTP_ROLES = new Set<MembershipRole>(["CHAIR", "TREASURER", "SECRETARY", "AUDITOR"]);

export interface ChamaChoice {
  chamaId: string;
  chamaName: string;
  role: MembershipRole;
  membershipId: string;
}

export type LoginResult =
  | { status: "invalid_credentials"; message: string; triesLeft?: number }
  | { status: "unknown_number"; message: string }
  | { status: "locked"; lockedUntil: string; message: string }
  | { status: "choose_chama"; chamas: ChamaChoice[] }
  | { status: "otp_required"; challengeId: string; demoCode?: string }
  | { status: "authenticated"; token: string; chamaId: string; membershipId: string; role: MembershipRole };

function triesLeftMessage(triesLeft: number): string {
  return `Wrong PIN. ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left.`;
}

async function unknownNumber(): Promise<LoginResult> {
  await verifyPin("0000", await dummyPinHash());
  const chamas = await prismaRaw.chama.findMany({
    select: { name: true },
    orderBy: { createdAt: "asc" },
    take: 2,
  });
  const where = chamas.length === 1 ? ` in ${chamas[0].name}` : "";
  return { status: "unknown_number", message: `We couldn't find that number${where}.` };
}

let dummyHash: Promise<string> | null = null;

function dummyPinHash(): Promise<string> {
  dummyHash ??= hashPin("000000");
  return dummyHash;
}

async function recordFailure(personId: string, attempts: number, now: Date): Promise<LoginResult> {
  const next = attempts + 1;
  if (next >= PIN_MAX_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + LOCKOUT_MS);
    await prismaRaw.person.update({
      where: { id: personId },
      data: { failedLoginAttempts: 0, lockedUntil },
    });
    return {
      status: "locked",
      lockedUntil: lockedUntil.toISOString(),
      message: "Too many attempts. Try again in 15 minutes.",
    };
  }
  await prismaRaw.person.update({
    where: { id: personId },
    data: { failedLoginAttempts: next },
  });
  const triesLeft = PIN_MAX_ATTEMPTS - next;
  return { status: "invalid_credentials", triesLeft, message: triesLeftMessage(triesLeft) };
}

async function openSession(input: {
  personId: string;
  membershipId: string;
  chamaId: string;
  role: MembershipRole;
  now: Date;
  ip?: string;
  userAgent?: string;
}): Promise<LoginResult> {
  const token = newSessionToken();
  await prismaRaw.session.create({
    data: {
      personId: input.personId,
      membershipId: input.membershipId,
      chamaId: input.chamaId,
      tokenHash: sha256(token),
      createdAt: input.now,
      lastSeenAt: input.now,
      expiresAt: new Date(input.now.getTime() + SESSION_IDLE_MS),
      ip: input.ip,
      userAgent: input.userAgent,
    },
  });
  await prismaRaw.person.update({
    where: { id: input.personId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
  return {
    status: "authenticated",
    token,
    chamaId: input.chamaId,
    membershipId: input.membershipId,
    role: input.role,
  };
}

export async function loginWithPin(input: {
  phone: string;
  pin: string;
  chamaId?: string;
  now?: Date;
  ip?: string;
  userAgent?: string;
  messaging?: MessagingProvider;
  demoOtpVisible?: boolean;
}): Promise<LoginResult> {
  const now = input.now ?? new Date();
  const phone = normalizePhone(input.phone);
  if (!phone) {
    await verifyPin(input.pin || "0000", await dummyPinHash());
    return { status: "invalid_credentials", message: "Enter a Kenyan mobile number, like 0712 345 005." };
  }
  if (!/^\d{4,6}$/.test(input.pin)) {
    await verifyPin(input.pin || "0000", await dummyPinHash());
    return { status: "invalid_credentials", message: "A PIN is 4 to 6 digits." };
  }

  const person = await prismaRaw.person.findUnique({ where: { phone } });
  if (!person) return unknownNumber();
  if (person.lockedUntil && person.lockedUntil > now) {
    return {
      status: "locked",
      lockedUntil: person.lockedUntil.toISOString(),
      message: "Too many attempts. Try again in 15 minutes.",
    };
  }
  if (person.lockedUntil && person.lockedUntil <= now) {
    await prismaRaw.person.update({
      where: { id: person.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    person.failedLoginAttempts = 0;
  }

  const memberships = await prismaRaw.membership.findMany({
    where: { personId: person.id },
    include: { chama: true },
  });
  const matches = [];
  for (const membership of memberships) {
    if (await verifyPin(input.pin, membership.hashedPin)) matches.push(membership);
  }
  if (matches.length === 0) {
    return recordFailure(person.id, person.failedLoginAttempts, now);
  }
  if (person.failedLoginAttempts !== 0) {
    await prismaRaw.person.update({
      where: { id: person.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const chosen = input.chamaId ? matches.filter((membership) => membership.chamaId === input.chamaId) : matches;
  if (chosen.length === 0) return recordFailure(person.id, person.failedLoginAttempts, now);
  if (chosen.length > 1) {
    return {
      status: "choose_chama",
      chamas: chosen.map((membership) => ({
        chamaId: membership.chamaId,
        chamaName: membership.chama.name,
        role: membership.role,
        membershipId: membership.id,
      })),
    };
  }

  const membership = chosen[0];
  if (OTP_ROLES.has(membership.role)) {
    const code = newOtpCode();
    const challenge = await prismaRaw.otpChallenge.create({
      data: {
        personId: person.id,
        membershipId: membership.id,
        chamaId: membership.chamaId,
        codeHash: sha256(code),
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
        createdAt: now,
      },
    });
    await (input.messaging ?? devMessaging).sendSms({
      to: person.phone,
      body: `Chama AI code: ${code}. It expires in 5 minutes.`,
    });
    return {
      status: "otp_required",
      challengeId: challenge.id,
      demoCode: input.demoOtpVisible ? code : undefined,
    };
  }

  return openSession({
    personId: person.id,
    membershipId: membership.id,
    chamaId: membership.chamaId,
    role: membership.role,
    now,
    ip: input.ip,
    userAgent: input.userAgent,
  });
}

export async function verifyOtp(input: {
  challengeId: string;
  code: string;
  now?: Date;
  ip?: string;
  userAgent?: string;
}): Promise<LoginResult | { status: "otp_invalid" } | { status: "otp_expired" }> {
  const now = input.now ?? new Date();
  const challenge = await prismaRaw.otpChallenge.findUnique({
    where: { id: input.challengeId },
    include: { membership: true },
  });
  if (!challenge || challenge.consumedAt || challenge.attempts >= OTP_MAX_ATTEMPTS) {
    return { status: "otp_invalid" };
  }
  if (challenge.expiresAt <= now) return { status: "otp_expired" };
  if (sha256(input.code) !== challenge.codeHash) {
    const attempts = challenge.attempts + 1;
    await prismaRaw.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts, consumedAt: attempts >= OTP_MAX_ATTEMPTS ? now : null },
    });
    return { status: "otp_invalid" };
  }
  await prismaRaw.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: now },
  });
  return openSession({
    personId: challenge.personId,
    membershipId: challenge.membershipId,
    chamaId: challenge.chamaId,
    role: challenge.membership.role,
    now,
    ip: input.ip,
    userAgent: input.userAgent,
  });
}

export interface ActiveSession {
  token: string;
  personId: string;
  membershipId: string;
  chamaId: string;
  role: MembershipRole;
  personName: string;
}

export async function getSession(token: string, now = new Date()): Promise<ActiveSession | null> {
  const session = await prismaRaw.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { membership: true, person: true },
  });
  if (!session || session.revokedAt) return null;
  if (now.getTime() - session.lastSeenAt.getTime() > SESSION_IDLE_MS || session.expiresAt <= now) {
    await prismaRaw.session.update({ where: { id: session.id }, data: { revokedAt: now } });
    return null;
  }
  await prismaRaw.session.update({
    where: { id: session.id },
    data: { lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_IDLE_MS) },
  });
  return {
    token,
    personId: session.personId,
    membershipId: session.membershipId,
    chamaId: session.chamaId,
    role: session.membership.role,
    personName: session.person.name,
  };
}

export async function logout(token: string, now = new Date()): Promise<void> {
  await prismaRaw.session.updateMany({
    where: { tokenHash: sha256(token), revokedAt: null },
    data: { revokedAt: now },
  });
}

export async function logoutAll(personId: string, now = new Date()): Promise<void> {
  await prismaRaw.session.updateMany({
    where: { personId, revokedAt: null },
    data: { revokedAt: now },
  });
}
