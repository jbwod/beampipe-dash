import { describe, expect, it, vi } from "vitest";
import type { Execution } from "@/shared/types/beampipe";
import { createOrResumeExecution } from "./run-workflow";

const run = { uuid: "run-1" } as Execution;

describe("createOrResumeExecution", () => {
  it("reuses the created ledger row when admission is retried", async () => {
    const create = vi.fn(async () => run);
    const firstStart = vi.fn(async () => { throw new Error("upstream unavailable"); });
    let created: Execution | null = null;

    await expect(createOrResumeExecution({ existing: created, create, start: firstStart, onCreated: (value) => { created = value; } })).rejects.toThrow("upstream unavailable");
    await expect(createOrResumeExecution({ existing: created, create, start: vi.fn(async () => undefined) })).resolves.toBe(run);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
