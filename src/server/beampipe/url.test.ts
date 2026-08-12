import { afterEach, describe, expect, it } from "vitest";
import { beampipeBaseUrl, beampipeUrl, normalizeApiPath } from "./url";

describe("Beampipe API URL policy", () => {
  const original = process.env.BEAMPIPE_API_URL;

  afterEach(() => {
    process.env.BEAMPIPE_API_URL = original;
  });

  it("normalizes the configured base URL", () => {
    process.env.BEAMPIPE_API_URL = "http://beampipe:8080/";
    expect(beampipeBaseUrl()).toBe("http://beampipe:8080");
    expect(beampipeUrl("/api/v2/health")).toBe("http://beampipe:8080/api/v2/health");
  });

  it("accepts only v2 API paths", () => {
    expect(normalizeApiPath("api/v2/sources")).toBe("/api/v2/sources");
    expect(() => normalizeApiPath("/admin")).toThrow(/\/api\/v2/);
    expect(() => normalizeApiPath("/api/v2/../admin")).toThrow(/Invalid/);
  });
});
