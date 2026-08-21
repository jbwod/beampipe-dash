import { describe, expect, it } from "vitest";
import { createProjectDraft, normalizeProjectDraft, updateDraft, validateProjectDraft } from "./project-draft";

describe("project draft updates", () => {
  it("patches nested config without dropping unknown fields", () => {
    const draft = { ...createProjectDraft(), future_extension: { retained: true } };
    const updated = updateDraft(draft, ["automation", "execution", "enabled"], true);
    expect(updated.automation.execution?.enabled).toBe(true);
    expect(updated.future_extension).toEqual({ retained: true });
    expect(draft.automation.execution?.enabled).toBe(false);
  });

  it("restores required nested sections when YAML contains nulls", () => {
    const normalized = normalizeProjectDraft({
      apiVersion: "beampipe.dev/v2",
      kind: "ProjectConfig",
      metadata: { id: "wallaby" },
      adapters: null,
      discovery: { queries: null, enrichments: null },
      automation: null,
      graph_patches: null,
    });
    expect(normalized.adapters.tap.timeout_seconds).toBe(90);
    expect(normalized.discovery.queries).toEqual([]);
    expect(normalized.automation.execution?.archive_name).toBe("casda");
    expect(normalized.graph_patches).toEqual([]);
  });

  it("reports unsafe project identity and contradictory execution grouping", () => {
    const draft = createProjectDraft("Invalid Project");
    draft.automation.execution!.min_sources_to_trigger = 5;
    draft.automation.execution!.max_sources_per_execution = 2;
    expect(validateProjectDraft(draft)).toEqual(expect.arrayContaining([
      expect.stringContaining("Project ID"),
      expect.stringContaining("Minimum sources"),
    ]));
  });
});
