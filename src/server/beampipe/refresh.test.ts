import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRefreshCoordinatorForTests, refreshTokenPair } from "./refresh";

const pair = { access_token: "access-2", refresh_token: "refresh-2", token_type: "bearer" };

beforeEach(() => vi.stubEnv("BEAMPIPE_API_URL", "http://beampipe.test"));
afterEach(() => {
  clearRefreshCoordinatorForTests();
  vi.unstubAllEnvs();
});

describe("refreshTokenPair", () => {
  it("coalesces concurrent rotation and reuses the result for late requests", async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    const fetcher = vi.fn(() => new Promise<Response>((resolve) => { resolveResponse = resolve; })) as unknown as typeof fetch;

    const first = refreshTokenPair("refresh-1", fetcher);
    const second = refreshTokenPair("refresh-1", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveResponse?.(Response.json(pair));
    await expect(Promise.all([first, second])).resolves.toEqual([pair, pair]);
    await expect(refreshTokenPair("refresh-1", fetcher)).resolves.toEqual(pair);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed refresh responses", async () => {
    const fetcher = vi.fn(async () => Response.json({ access_token: "missing-refresh" })) as unknown as typeof fetch;
    await expect(refreshTokenPair("refresh-1", fetcher)).resolves.toBeNull();
  });
});
