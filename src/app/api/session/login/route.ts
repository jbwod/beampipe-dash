import { NextResponse } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE, accessCookieOptions, REFRESH_COOKIE, refreshCookieOptions } from "@/server/auth/cookies";
import { isTrustedBrowserRequest } from "@/server/auth/origin";
import { beampipeUrl } from "@/server/beampipe/url";
import { isTokenPair } from "@/server/beampipe/token";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(4096),
});

export async function POST(request: Request) {
  if (!isTrustedBrowserRequest(request)) {
    return NextResponse.json({ message: "Cross-origin request rejected" }, { status: 403 });
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Username and password are required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(beampipeUrl("/api/v2/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const payload: unknown = await upstream.json().catch(() => null);
    if (!upstream.ok || !isTokenPair(payload)) {
      return NextResponse.json(
        { message: upstream.status === 401 ? "Invalid username or password" : "Login failed" },
        { status: upstream.status || 502 },
      );
    }

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(ACCESS_COOKIE, payload.access_token, accessCookieOptions);
    response.cookies.set(REFRESH_COOKIE, payload.refresh_token, refreshCookieOptions);
    return response;
  } catch {
    return NextResponse.json({ message: "Beampipe is unreachable" }, { status: 503 });
  }
}
