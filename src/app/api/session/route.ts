import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/server/auth/cookies";
import { beampipeUrl } from "@/server/beampipe/url";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

  const upstream = await fetch(beampipeUrl("/api/v2/user/me"), {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);
  if (!upstream?.ok) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, user: await upstream.json() });
}
