import { describe, expect, it } from "vitest";
import { isTokenPair } from "./token";

describe("isTokenPair", () => {
  it("accepts complete bearer token pairs", () => {
    expect(isTokenPair({ access_token: "a", refresh_token: "r", token_type: "bearer" })).toBe(true);
  });

  it("rejects partial and differently typed tokens", () => {
    expect(isTokenPair({ access_token: "a", token_type: "bearer" })).toBe(false);
    expect(isTokenPair({ access_token: "a", refresh_token: "r", token_type: "basic" })).toBe(false);
  });
});
