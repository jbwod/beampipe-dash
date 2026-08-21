import { describe, expect, it, vi } from "vitest";
import type { Execution } from "@/shared/types/beampipe";
import { createOrResumeExecution, executionCreationKey } from "./run-workflow";

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

  it("persists one creation key for exact retries and rotates it for a changed request", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    const randomUuid = vi.fn().mockReturnValueOnce("key-1").mockReturnValueOnce("key-2");
    expect(executionCreationKey("payload-a", storage, randomUuid)).toBe("key-1");
    expect(executionCreationKey("payload-a", storage, randomUuid)).toBe("key-1");
    expect(executionCreationKey("payload-b", storage, randomUuid)).toBe("key-2");
    expect(randomUuid).toHaveBeenCalledTimes(2);
  });
});
