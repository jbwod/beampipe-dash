const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isTrustedBrowserRequest(request: Request) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  return origin === new URL(request.url).origin;
}
