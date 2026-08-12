const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isTrustedBrowserRequest(request: Request) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
    const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto"));
    const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
    const protocol = forwardedProto ? `${forwardedProto.replace(/:$/, "")}:` : requestUrl.protocol;
    return originUrl.host === host && originUrl.protocol === protocol;
  } catch {
    return false;
  }
}

function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}
