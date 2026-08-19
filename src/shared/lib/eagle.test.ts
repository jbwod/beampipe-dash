import { describe, expect, it } from "vitest";
import { eagleUrlFromGraphUrl } from "./eagle";

describe("EAGLE deep links", () => {
  it("converts GitHub blob graph URLs into EAGLE repository parameters", () => {
    const result = new URL(
      eagleUrlFromGraphUrl(
        "https://github.com/ICRAR/EAGLE-graph-repo/blob/master/examples/HelloWorld-Universe.graph",
      )!,
    );
    expect(result.searchParams.get("service")).toBe("GitHub");
    expect(result.searchParams.get("repository")).toBe("ICRAR/EAGLE-graph-repo");
    expect(result.searchParams.get("branch")).toBe("master");
    expect(result.searchParams.get("path")).toBe("examples");
    expect(result.searchParams.get("filename")).toBe("HelloWorld-Universe.graph");
  });

  it("opens raw GitHub graph URLs with EAGLE service=Url", () => {
    const raw =
      "https://raw.githubusercontent.com/jbwod/wallaby-hires-beampipe/refs/heads/main/dlg-graphs/wallaby-hires_deploy-setonix-beampipe.graph";
    const result = new URL(eagleUrlFromGraphUrl(raw)!);
    expect(result.searchParams.get("service")).toBe("Url");
    expect(result.searchParams.get("url")).toBe(raw);
    expect(result.searchParams.get("repository")).toBeNull();
  });

  it("opens github.com /raw/ graph URLs with EAGLE service=Url", () => {
    const raw =
      "https://github.com/ICRAR/EAGLE-graph-repo/raw/master/examples/HelloWorld-Universe.graph";
    const result = new URL(eagleUrlFromGraphUrl(raw)!);
    expect(result.searchParams.get("service")).toBe("Url");
    expect(result.searchParams.get("url")).toBe(raw);
  });

  it("strips refs/heads from GitHub blob URLs", () => {
    const result = new URL(
      eagleUrlFromGraphUrl(
        "https://github.com/jbwod/wallaby-hires-beampipe/blob/refs/heads/main/dlg-graphs/wallaby-hires_deploy-setonix-beampipe.graph",
      )!,
    );
    expect(result.searchParams.get("service")).toBe("GitHub");
    expect(result.searchParams.get("branch")).toBe("main");
    expect(result.searchParams.get("path")).toBe("dlg-graphs");
    expect(result.searchParams.get("filename")).toBe(
      "wallaby-hires_deploy-setonix-beampipe.graph",
    );
  });

  it("rejects non-GitHub and non-graph URLs", () => {
    expect(eagleUrlFromGraphUrl("https://example.test/graph.json")).toBeNull();
    expect(eagleUrlFromGraphUrl("not a url")).toBeNull();
  });
});
