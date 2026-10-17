import { loginWithPin } from "@/lib/auth/service";
import { clientIp, demoOtpVisible, limitAuth, setSessionCookie } from "@/lib/auth/http";

export async function POST(request: Request) {
  const limit = limitAuth(request, "login");
  if (!limit.ok) {
    return Response.json({ status: "rate_limited", retryAfterMs: limit.retryAfterMs }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { phone?: string; pin?: string; chamaId?: string } | null;
  if (!body?.phone) {
    return Response.json({ status: "invalid_credentials", message: "Enter your phone number." }, { status: 400 });
  }
  const result = await loginWithPin({
    phone: body.phone,
    pin: body.pin,
    chamaId: body.chamaId,
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
    demoOtpVisible: demoOtpVisible(),
  });
  if (result.status === "authenticated") {
    await setSessionCookie(result.token, result.role);
    return Response.json({ status: "authenticated", role: result.role, chamaId: result.chamaId });
  }
  const status =
    result.status === "invalid_credentials" || result.status === "unknown_number"
      ? 401
      : result.status === "rate_limited"
        ? 429
        : 200;
  return Response.json(result, { status });
}
