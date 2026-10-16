import { afterEach, describe, expect, it } from "vitest";
import { hashPin } from "@/lib/auth/pin";
import { maskPhone, normalizePhone } from "@/lib/auth/phone";
import { consumeRateLimit, resetRateLimits } from "@/lib/auth/rate-limit";
import { sessionCookieOptions } from "@/lib/auth/session";
import { getSession, loginWithPin, logout, logoutAll, verifyOtp } from "@/lib/auth/service";
import { MemoryMessagingProvider } from "@/lib/messaging/provider";
import { prismaRaw } from "@/lib/db";
import { umojaSettings } from "@/lib/chama/rules";
import { loanApprovalsSatisfied } from "@/lib/approvals/maker-checker";
import { parseChamaSettings } from "@/lib/chama/rules";
import { resetDatabase } from "./db";

const now = new Date("2026-10-16T09:00:00.000Z");

async function member(input: {
  phone: string;
  role?: "MEMBER" | "TREASURER" | "CHAIR";
  chamaName?: string;
  pin?: string;
}) {
  const chama = await prismaRaw.chama.create({
    data: { name: input.chamaName ?? "Umoja", settings: umojaSettings, plan: "PRO", status: "ACTIVE" },
  });
  const person = await prismaRaw.person.create({
    data: { name: "Tester", phone: input.phone, channelPrefs: {}, consent: {} },
  });
  const membership = await prismaRaw.membership.create({
    data: {
      chamaId: chama.id,
      personId: person.id,
      role: input.role ?? "MEMBER",
      memberNo: "M001",
      joinDate: new Date("2026-01-03T00:00:00.000Z"),
      hashedPin: await hashPin(input.pin ?? "2580"),
    },
  });
  return { chama, person, membership };
}

afterEach(async () => {
  resetRateLimits();
  await resetDatabase();
});

describe("auth", () => {
  it("normalises Safaricom numbers and masks them", () => {
    expect(normalizePhone("0712345005")).toBe("+254712345005");
    expect(normalizePhone("712345005")).toBe("+254712345005");
    expect(normalizePhone("254712345005")).toBe("+254712345005");
    expect(normalizePhone("+254 712 345 005")).toBe("+254712345005");
    expect(normalizePhone("12345")).toBeNull();
    expect(maskPhone("+254712345005")).toBe("+254712***005");
    expect(maskPhone("123")).toBe("hidden");
  });

  it("signs in a member and locks the phone after five bad PINs", async () => {
    await member({ phone: "+254712345005" });
    const ok = await loginWithPin({ phone: "0712345005", pin: "2580", now });
    expect(ok.status).toBe("authenticated");
    if (ok.status !== "authenticated") return;
    const session = await getSession(ok.token, new Date(now.getTime() + 60_000));
    expect(session?.role).toBe("MEMBER");
    expect(await getSession(ok.token, new Date(now.getTime() + 60_000 + 31 * 60_000))).toBeNull();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const failed = await loginWithPin({ phone: "+254712345005", pin: "0000", now });
      expect(failed.status).toBe("invalid_credentials");
    }
    const locked = await loginWithPin({ phone: "+254712345005", pin: "0000", now });
    expect(locked.status).toBe("locked");
    const still = await loginWithPin({ phone: "+254712345005", pin: "2580", now: new Date(now.getTime() + 60_000) });
    expect(still.status).toBe("locked");
    const later = await loginWithPin({
      phone: "+254712345005",
      pin: "2580",
      now: new Date(now.getTime() + 16 * 60_000),
    });
    expect(later.status).toBe("authenticated");
    expect(await loginWithPin({ phone: "nope", pin: "2580", now })).toMatchObject({ status: "invalid_credentials" });
  });

  it("asks an official for a one-time code and can sign every device out", async () => {
    const fixture = await member({ phone: "+254712345002", role: "TREASURER" });
    const other = await prismaRaw.chama.create({
      data: { name: "Second", settings: umojaSettings, plan: "FREE", status: "ACTIVE" },
    });
    await prismaRaw.membership.create({
      data: {
        chamaId: other.id,
        personId: fixture.person.id,
        role: "MEMBER",
        memberNo: "M009",
        joinDate: new Date("2026-02-01T00:00:00.000Z"),
        hashedPin: fixture.membership.hashedPin,
      },
    });
    const messaging = new MemoryMessagingProvider();
    const choice = await loginWithPin({ phone: "+254712345002", pin: "2580", now, messaging });
    expect(choice.status).toBe("choose_chama");
    if (choice.status !== "choose_chama") return;

    const pending = await loginWithPin({
      phone: "+254712345002",
      pin: "2580",
      chamaId: fixture.chama.id,
      now,
      messaging,
      demoOtpVisible: true,
    });
    expect(pending.status).toBe("otp_required");
    if (pending.status !== "otp_required") return;
    expect(messaging.sent.at(-1)?.body).toContain(pending.demoCode);
    expect(await verifyOtp({ challengeId: pending.challengeId, code: "000000", now })).toMatchObject({
      status: "otp_invalid",
    });
    const authed = await verifyOtp({ challengeId: pending.challengeId, code: pending.demoCode ?? "", now });
    expect(authed.status).toBe("authenticated");
    if (authed.status !== "authenticated") return;
    expect(await verifyOtp({ challengeId: pending.challengeId, code: pending.demoCode ?? "", now })).toMatchObject({
      status: "otp_invalid",
    });

    const second = await loginWithPin({ phone: "+254712345002", pin: "2580", chamaId: other.id, now });
    expect(second.status).toBe("authenticated");
    if (second.status !== "authenticated") return;
    await logoutAll(fixture.person.id, now);
    expect(await getSession(authed.token, now)).toBeNull();
    expect(await getSession(second.token, now)).toBeNull();
    await logout(authed.token, now);
  });

  it("expires a code and locks it after five misses", async () => {
    await member({ phone: "+254712345001", role: "CHAIR" });
    const pending = await loginWithPin({ phone: "+254712345001", pin: "2580", now, demoOtpVisible: true });
    if (pending.status !== "otp_required") throw new Error("expected a code");
    expect(
      await verifyOtp({
        challengeId: pending.challengeId,
        code: pending.demoCode ?? "",
        now: new Date(now.getTime() + 6 * 60_000),
      }),
    ).toMatchObject({ status: "otp_expired" });

    const again = await loginWithPin({ phone: "+254712345001", pin: "2580", now, demoOtpVisible: true });
    if (again.status !== "otp_required") throw new Error("expected a code");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(await verifyOtp({ challengeId: again.challengeId, code: "111111", now })).toMatchObject({
        status: "otp_invalid",
      });
    }
    expect(await verifyOtp({ challengeId: again.challengeId, code: again.demoCode ?? "", now })).toMatchObject({
      status: "otp_invalid",
    });
  });

  it("limits repeated calls and describes the session cookie", () => {
    expect(consumeRateLimit("login", 2, 1_000, 0).ok).toBe(true);
    expect(consumeRateLimit("login", 2, 1_000, 10).ok).toBe(true);
    expect(consumeRateLimit("login", 2, 1_000, 20).ok).toBe(false);
    expect(consumeRateLimit("login", 2, 1_000, 1_500).ok).toBe(true);
    const env = process.env as { NODE_ENV?: string };
    const previous = env.NODE_ENV;
    env.NODE_ENV = "production";
    expect(sessionCookieOptions().secure).toBe(true);
    env.NODE_ENV = "test";
    expect(sessionCookieOptions().httpOnly).toBe(true);
    expect(sessionCookieOptions().sameSite).toBe("lax");
    env.NODE_ENV = previous;
  });
});

describe("rules and maker-checker", () => {
  it("accepts the Umoja rules and rejects a backwards loan term", () => {
    expect(parseChamaSettings(umojaSettings).monthlyContributionCents).toBe(200_000);
    expect(() => parseChamaSettings({ ...umojaSettings, loanMinMonths: 6, loanMaxMonths: 1 })).toThrow(/loanMaxMonths/);
  });

  it("requires a second official above the limit and blocks self-approval", () => {
    const base = {
      amountCents: 1_000_000,
      limitCents: 2_000_000,
      requesterMembershipId: "member",
      borrowerMembershipId: "member",
      borrowerIsTreasurer: false,
      approvals: [{ membershipId: "treasurer", role: "TREASURER" as const }],
    };
    expect(loanApprovalsSatisfied(base).ok).toBe(true);
    expect(loanApprovalsSatisfied({ ...base, approvals: [{ membershipId: "member", role: "TREASURER" }] }).ok).toBe(false);
    expect(
      loanApprovalsSatisfied({
        ...base,
        borrowerIsTreasurer: true,
        borrowerMembershipId: "treasurer",
        requesterMembershipId: "treasurer",
        approvals: [{ membershipId: "chair", role: "CHAIR" }],
      }).ok,
    ).toBe(true);
    expect(
      loanApprovalsSatisfied({
        ...base,
        amountCents: 3_000_000,
        approvals: [
          { membershipId: "treasurer", role: "TREASURER" },
          { membershipId: "chair", role: "CHAIR" },
        ],
      }).ok,
    ).toBe(true);
    expect(loanApprovalsSatisfied({ ...base, amountCents: 3_000_000 }).reasons).toContain("NEEDS_TREASURER_AND_CHAIR");
    expect(
      loanApprovalsSatisfied({
        ...base,
        amountCents: 3_000_000,
        borrowerIsTreasurer: true,
        borrowerMembershipId: "treasurer",
        requesterMembershipId: "treasurer",
        approvals: [
          { membershipId: "chair", role: "CHAIR" },
          { membershipId: "secretary", role: "SECRETARY" },
        ],
      }).ok,
    ).toBe(true);
  });
});
