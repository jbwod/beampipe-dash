import { describe, expect, it } from "vitest";
import { resolveDaliugeState, resolveOutputState } from "./run-state";

describe("resolveDaliugeState", () => {
  it("projects the canonical DALiuGE state over a stale legacy DIM state", () => {
    expect(resolveDaliugeState({
      daliuge_state: "finished",
      dim_state: "unknown",
    }, "running")).toBe("finished");
  });

  it("normalizes state values and skips legacy unknown placeholders", () => {
    expect(resolveDaliugeState({
      daliuge_state: null,
      dim_state: " UNKNOWN ",
    }, " FINISHED ")).toBe("finished");
  });
});

describe("resolveOutputState", () => {
  it("shows an explicit opt-out instead of the internal not-started state", () => {
    expect(resolveOutputState("not_started", {
      output_state: "not_started",
      output_verification_required: false,
    })).toBe("not_required");
  });

  it("preserves the canonical state when output verification is required", () => {
    expect(resolveOutputState("verified", {
      output_state: "pending",
      output_verification_required: true,
    })).toBe("verified");
  });
});
