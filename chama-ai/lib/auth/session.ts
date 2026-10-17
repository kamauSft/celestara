import { createHash, randomBytes, randomInt } from "node:crypto";

export const SESSION_COOKIE = "chama_session";
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const MEMBER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS = 3;
export const OTP_SEND_WINDOW_MS = 15 * 60 * 1000;
export const PIN_MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function newOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function sessionLifetimeMs(role: string): number {
  return role === "MEMBER" ? MEMBER_SESSION_MS : SESSION_IDLE_MS;
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_IDLE_MS / 1000) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
