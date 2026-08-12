import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/server/auth/cookies";
import { isTrustedBrowserRequest } from "@/server/auth/origin";
import { beampipeUrl } from "@/server/beampipe/url";

export async function POST(request: Request) {
  if (!isTrustedBrowserRequest(request)) {
    return NextResponse.json({ message: "Cross-origin request rejected" }, { status: 403 });
  }

  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (accessToken || refreshToken) {
    await fetch(beampipeUrl("/api/v2/logout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
      signal: AbortSignal.timeout(5_000),
    }).catch(() => null);
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
