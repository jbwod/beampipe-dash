import { describe, expect, it } from "vitest";
import { isTrustedBrowserRequest } from "./origin";

describe("isTrustedBrowserRequest", () => {
  it("accepts safe and same-origin requests", () => {
    expect(isTrustedBrowserRequest(new Request("https://dash.example/api", { method: "GET" }))).toBe(true);
    expect(
      isTrustedBrowserRequest(
        new Request("https://dash.example/api", {
          method: "POST",
          headers: { origin: "https://dash.example" },
        }),
      ),
    ).toBe(true);
  });

  it("rejects cross-origin cookie mutations", () => {
    expect(
      isTrustedBrowserRequest(
        new Request("https://dash.example/api", {
          method: "POST",
          headers: { origin: "https://elsewhere.example" },
        }),
      ),
    ).toBe(false);
  });
});
