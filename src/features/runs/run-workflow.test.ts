import { describe, expect, it, vi } from "vitest";
import type { Execution } from "@/shared/types/beampipe";
import {
  abandonExecutionCreationKey,
  consumeExecutionCreationKey,
  createOrResumeExecution,
  executionCreationFingerprint,
  executionCreationKey,
  freezeExecutionCreationAttempt,
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

  it("matches Core's canonical create request and ignores runtime revision drift", () => {
    const payload = {
      project_module: " wallaby ",
      archive_name: " casda ",
      sources: [{ source_identifier: " J1 ", sbids: [" 123 "] }, { source_identifier: "J2" }],
      deployment_profile_id: null,
      deployment_profile_name: " profile-a ",
    };

    expect(executionCreationFingerprint(payload)).toBe(JSON.stringify({
      project_module: "wallaby",
      sources: [
        { source_identifier: "J1", sbids: ["123"] },
        { source_identifier: "J2", sbids: null },
      ],
      archive_name: "casda",
      deployment_profile_id: null,
      deployment_profile_name: "profile-a",
    }));
    // Source signatures and pinned config/profile revisions are intentionally
    // not inputs, so a retry after those background values drift is identical.
    expect(executionCreationFingerprint(payload)).toBe(executionCreationFingerprint(structuredClone(payload)));
  });

  it("keeps an ambiguous attempt key through background drift and rotates for a body edit", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    const randomUuid = vi.fn().mockReturnValueOnce("key-1").mockReturnValueOnce("key-2");
    const payload = { project_module: "wallaby", archive_name: "casda", sources: [{ source_identifier: "J1" }] };
    const fingerprint = executionCreationFingerprint(payload);

    expect(executionCreationKey(fingerprint, storage, randomUuid)).toBe("key-1");
    // A refetch may change discovery/config/profile revisions, but none of
    // those values changes the canonical create request or its stored key.
    expect(executionCreationKey(executionCreationFingerprint(payload), storage, randomUuid)).toBe("key-1");
    abandonExecutionCreationKey(fingerprint, storage);
    expect(executionCreationKey(executionCreationFingerprint({ ...payload, archive_name: "other" }), storage, randomUuid)).toBe("key-2");
  });

  it("freezes the submitted body for an ambiguous retry", () => {
    const payload = { project_module: "wallaby", archive_name: "casda", sources: [{ source_identifier: "J1" }] };
    const attempt = freezeExecutionCreationAttempt(payload);

    payload.archive_name = "changed-by-the-editor";
    payload.sources[0].source_identifier = "J2";

    expect(attempt.payload).toEqual({ project_module: "wallaby", archive_name: "casda", sources: [{ source_identifier: "J1" }] });
    expect(attempt.fingerprint).toBe(executionCreationFingerprint(attempt.payload));
  });
});
