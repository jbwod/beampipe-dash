import { createHash } from "node:crypto";
import { beampipeUrl } from "./url";
import { isTokenPair, type TokenPair } from "./token";

const SUCCESS_CACHE_MS = 30_000;
const FAILURE_CACHE_MS = 1_000;

interface RefreshEntry {
  expiresAt: number;
  promise: Promise<TokenPair | null>;
}

const refreshes = new Map<string, RefreshEntry>();

/**
 * Coalesces refresh-token rotation for requests that arrive at the same
 * dashboard instance together. Successful rotations stay cached briefly so a
 * late request carrying the superseded browser cookie receives the same pair.
 */
export function refreshTokenPair(
  refreshToken: string,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<TokenPair | null> {
  const timestamp = now();
  pruneExpired(timestamp);
  const key = tokenKey(refreshToken);
  const existing = refreshes.get(key);
  if (existing && existing.expiresAt > timestamp) return existing.promise;

  const promise = requestTokenPair(refreshToken, fetcher).then((pair) => {
    const entry = refreshes.get(key);
    if (entry?.promise === promise) {
      entry.expiresAt = now() + (pair ? SUCCESS_CACHE_MS : FAILURE_CACHE_MS);
    }
    return pair;
  });
  refreshes.set(key, { expiresAt: timestamp + SUCCESS_CACHE_MS, promise });
  return promise;
}

export function clearRefreshCoordinatorForTests() {
  refreshes.clear();
}

async function requestTokenPair(refreshToken: string, fetcher: typeof fetch) {
  const response = await fetcher(beampipeUrl("/api/v2/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!response?.ok) return null;
  const payload: unknown = await response.json().catch(() => null);
  return isTokenPair(payload) ? payload : null;
}

function tokenKey(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function pruneExpired(now: number) {
  for (const [key, entry] of refreshes) {
    if (entry.expiresAt <= now) refreshes.delete(key);
  }
}
