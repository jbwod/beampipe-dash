import { describe, expect, it } from "vitest";
import { createProjectDraft, updateDraft } from "./project-draft";

describe("project draft updates", () => {
  it("patches nested config without dropping unknown fields", () => {
    const draft = { ...createProjectDraft(), future_extension: { retained: true } };
    const updated = updateDraft(draft, ["automation", "execution", "enabled"], true);
    expect(updated.automation.execution?.enabled).toBe(true);
    expect(updated.future_extension).toEqual({ retained: true });
    expect(draft.automation.execution?.enabled).toBe(false);
  });
});
