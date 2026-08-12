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

  it("uses the request host when Next reconstructs a different local URL", () => {
    expect(
      isTrustedBrowserRequest(
        new Request("http://localhost:3100/api", {
          method: "POST",
          headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
        }),
      ),
    ).toBe(true);
  });

  it("accepts the external authority supplied by a reverse proxy", () => {
    expect(
      isTrustedBrowserRequest(
        new Request("http://beampipe-dash:3000/api", {
          method: "POST",
          headers: {
            origin: "https://operations.example",
            "x-forwarded-host": "operations.example",
            "x-forwarded-proto": "https",
          },
        }),
      ),
    ).toBe(true);
  });

  it("rejects protocol mismatches and malformed origins", () => {
    expect(isTrustedBrowserRequest(new Request("https://dash.example/api", { method: "POST", headers: { origin: "http://dash.example" } }))).toBe(false);
    expect(isTrustedBrowserRequest(new Request("https://dash.example/api", { method: "POST", headers: { origin: "null" } }))).toBe(false);
  });
});
