import { describe, expect, it, vi } from "vitest";
import type { Execution, SourceRegistryRow } from "@/shared/types/beampipe";
import {
  consumeExecutionCreationKey,
  createOrResumeExecution,
  executionCreationFingerprint,
  executionCreationKey,
} from "./run-workflow";

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
      removeItem: (key: string) => { values.delete(key); },
    };
    const randomUuid = vi.fn().mockReturnValueOnce("key-1").mockReturnValueOnce("key-2");
    expect(executionCreationKey("payload-a", storage, randomUuid)).toBe("key-1");
    expect(executionCreationKey("payload-a", storage, randomUuid)).toBe("key-1");
    expect(executionCreationKey("payload-b", storage, randomUuid)).toBe("key-2");
    expect(randomUuid).toHaveBeenCalledTimes(2);
  });

  it("retains a key across an uncertain retry and consumes it only after create plus start succeeds", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    const randomUuid = vi.fn().mockReturnValueOnce("key-1").mockReturnValueOnce("key-2");
    const fingerprint = "payload-a";
    const first = executionCreationKey(fingerprint, storage, randomUuid);
    let created: Execution | null = null;
    const mutate = async (start: (execution: Execution) => Promise<unknown>) => {
      const key = executionCreationKey(fingerprint, storage, randomUuid);
      const result = await createOrResumeExecution({
        existing: created,
        create: async () => run,
        start,
        onCreated: (value) => { created = value; },
      });
      consumeExecutionCreationKey(fingerprint, key, storage);
      return result;
    };

    await expect(mutate(async () => { throw new Error("response lost"); })).rejects.toThrow("response lost");
    expect(executionCreationKey(fingerprint, storage, randomUuid)).toBe(first);
    await expect(mutate(async () => undefined)).resolves.toBe(run);
    expect(executionCreationKey("payload-a", storage, randomUuid)).toBe("key-2");
  });

  it("changes the fingerprint when discovery or pinned revisions change", () => {
    const payload = { project_module: "wallaby", archive_name: "casda", sources: [{ source_identifier: "J1" }] };
    const source = { source_identifier: "J1", discovery_signature: "sig-1" } as SourceRegistryRow;
    const initial = executionCreationFingerprint(payload, [source], 1, 2);
    expect(executionCreationFingerprint(payload, [{ ...source, discovery_signature: "sig-2" }], 1, 2)).not.toBe(initial);
    expect(executionCreationFingerprint(payload, [source], 2, 2)).not.toBe(initial);
    expect(executionCreationFingerprint(payload, [source], 1, 3)).not.toBe(initial);
  });
});
