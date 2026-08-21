import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  accessCookieOptions,
  REFRESH_COOKIE,
  refreshCookieOptions,
} from "@/server/auth/cookies";
import { isTrustedBrowserRequest } from "@/server/auth/origin";
import { beampipeUrl } from "@/server/beampipe/url";
import { refreshTokenPair } from "@/server/beampipe/refresh";
import type { TokenPair } from "@/server/beampipe/token";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handler(request: Request, context: RouteContext) {
  if (!isTrustedBrowserRequest(request)) {
    return NextResponse.json({ message: "Cross-origin request rejected" }, { status: 403 });
  }

  const store = await cookies();
  const { path } = await context.params;
  if (isSessionEndpoint(path)) {
    return NextResponse.json({ message: "Use the dashboard session endpoint" }, { status: 404 });
  }
  const upstreamPath = `/api/v2/${path.join("/")}`;
  const incomingUrl = new URL(request.url);
  const target = new URL(beampipeUrl(upstreamPath));
  target.search = incomingUrl.search;

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  let pair: TokenPair | null = null;
  let upstream = await forward(request, target, store.get(ACCESS_COOKIE)?.value, body);

  if (upstream.status === 401) {
    const refreshToken = store.get(REFRESH_COOKIE)?.value;
    if (refreshToken) {
      pair = await refreshTokenPair(refreshToken);
      if (pair) upstream = await forward(request, target, pair.access_token, body);
    }
  }

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders(upstream.headers),
  });
  if (pair) {
    response.cookies.set(ACCESS_COOKIE, pair.access_token, accessCookieOptions);
    response.cookies.set(REFRESH_COOKIE, pair.refresh_token, refreshCookieOptions);
  }
  return response;
}

function isSessionEndpoint(path: string[]) {
  return path.length === 1 && ["login", "logout", "refresh"].includes(path[0]?.toLowerCase() ?? "");
}

function forward(request: Request, target: URL, token: string | undefined, body: ArrayBuffer | undefined) {
  const contentType = request.headers.get("content-type");
  return fetch(target, {
    method: request.method,
    headers: {
      Accept: request.headers.get("accept") ?? "application/json",
      ...(contentType ? { "Content-Type": contentType } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(120_000),
  });
}

function responseHeaders(headers: Headers) {
  const next = new Headers();
  for (const name of ["content-type", "content-disposition", "etag", "last-modified"]) {
    const value = headers.get(name);
    if (value) next.set(name, value);
  }
  next.set("Cache-Control", "no-store");
  return next;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
