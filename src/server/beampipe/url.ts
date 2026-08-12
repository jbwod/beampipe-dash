const API_PREFIX = "/api/v2";

export function beampipeBaseUrl() {
  const configured = process.env.BEAMPIPE_API_URL?.trim();
  if (!configured) {
    throw new Error("BEAMPIPE_API_URL is not configured");
  }
  return configured.replace(/\/+$/, "");
}

export function beampipeUrl(path: string) {
  const normalized = normalizeApiPath(path);
  return `${beampipeBaseUrl()}${normalized}`;
}

export function normalizeApiPath(path: string) {
  const decoded = decodeURIComponent(path);
  const withSlash = decoded.startsWith("/") ? decoded : `/${decoded}`;
  if (!withSlash.startsWith(`${API_PREFIX}/`) && withSlash !== API_PREFIX) {
    throw new Error("Only Beampipe /api/v2 paths may be proxied");
  }
  if (withSlash.includes("..") || withSlash.includes("\\")) {
    throw new Error("Invalid Beampipe API path");
  }
  return withSlash;
}
