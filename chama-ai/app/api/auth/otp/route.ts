import { verifyOtp } from "@/lib/auth/service";
import { clientIp, limitAuth, setSessionCookie } from "@/lib/auth/http";

export async function POST(request: Request) {
  const limit = limitAuth(request, "otp");
  if (!limit.ok) {
    return Response.json({ status: "rate_limited", retryAfterMs: limit.retryAfterMs }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { challengeId?: string; code?: string } | null;
  if (!body?.challengeId || !body.code) {
    return Response.json({ status: "otp_invalid" }, { status: 400 });
  }
  const result = await verifyOtp({
    challengeId: body.challengeId,
    code: body.code,
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });
  if (result.status === "authenticated") {
    await setSessionCookie(result.token);
    return Response.json({ status: "authenticated", role: result.role });
  }
  return Response.json(result, { status: 401 });
}
