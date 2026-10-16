import { cookies } from "next/headers";
import { consumeRateLimit } from "./rate-limit";
import { SESSION_COOKIE, sessionCookieOptions } from "./session";

export function demoOtpVisible(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEMO_OTP_VISIBLE === "true";
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function limitAuth(request: Request, bucket: string) {
  return consumeRateLimit(`${bucket}:${clientIp(request)}`, 20, 15 * 60 * 1000);
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
