import { describe, expect, it } from "vitest";
import { resolveDaliugeState } from "./run-state";

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
