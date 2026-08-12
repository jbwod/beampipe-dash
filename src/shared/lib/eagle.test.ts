import { describe, expect, it } from "vitest";
import { eagleUrlFromGraphUrl } from "./eagle";

describe("EAGLE deep links", () => {
  it("converts GitHub graph URLs into EAGLE repository parameters", () => {
    const result = new URL(eagleUrlFromGraphUrl("https://github.com/ICRAR/EAGLE-graph-repo/blob/master/examples/HelloWorld-Universe.graph")!);
    expect(result.searchParams.get("service")).toBe("GitHub");
    expect(result.searchParams.get("repository")).toBe("ICRAR/EAGLE-graph-repo");
    expect(result.searchParams.get("branch")).toBe("master");
    expect(result.searchParams.get("path")).toBe("examples");
    expect(result.searchParams.get("filename")).toBe("HelloWorld-Universe.graph");
  });

  it("rejects non-GitHub and non-graph URLs", () => {
    expect(eagleUrlFromGraphUrl("https://example.test/graph.json")).toBeNull();
    expect(eagleUrlFromGraphUrl("not a url")).toBeNull();
  });
});
