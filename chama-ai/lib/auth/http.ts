import { cookies } from "next/headers";
import { consumeRateLimit } from "./rate-limit";
import { SESSION_COOKIE, sessionCookieOptions, sessionLifetimeMs } from "./session";

export function demoMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DEMO_MODE === "true" || process.env.DEMO_OTP_VISIBLE === "true";
}

export function demoOtpVisible(): boolean {
  return demoMode();
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function limitAuth(request: Request, bucket: string) {
  return consumeRateLimit(`${bucket}:${clientIp(request)}`, 20, 15 * 60 * 1000);
}

export async function setSessionCookie(token: string, role = "MEMBER") {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(sessionLifetimeMs(role) / 1000));
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
