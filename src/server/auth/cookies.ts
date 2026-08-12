import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const ACCESS_COOKIE = "beampipe_dash_access";
export const REFRESH_COOKIE = "beampipe_dash_refresh";

const secure = process.env.BEAMPIPE_DASH_SECURE_COOKIES === "true";

export const accessCookieOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  sameSite: "lax",
  secure,
  path: "/",
  maxAge: 15 * 60,
};

export const refreshCookieOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  sameSite: "lax",
  secure,
  path: "/",
  maxAge: 30 * 24 * 60 * 60,
};
