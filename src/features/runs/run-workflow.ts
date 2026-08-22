import type { Execution, ExecutionCreatePayload, SourceRegistryRow } from "@/shared/types/beampipe";

const CREATION_KEY_STORAGE = "beampipe:execution-create";

export interface CreateExecutionStep {
  existing: Execution | null;
  create: () => Promise<Execution>;
  start?: (run: Execution) => Promise<unknown>;
  onCreated?: (run: Execution) => void;
}

/**
 * Keeps ledger creation separate from backend admission. If admission fails,
 * callers can retry with the returned/stored execution instead of creating a
 * second ledger row.
 */
export async function createOrResumeExecution(step: CreateExecutionStep) {
  const run = step.existing ?? await step.create();
  if (!step.existing) step.onCreated?.(run);
  if (step.start) await step.start(run);
  return run;
}

export function executionCreationKey(
  fingerprint: string,
  storage: Pick<Storage, "getItem" | "setItem"> = window.sessionStorage,
  randomUuid: () => string = () => crypto.randomUUID(),
) {
  const stored = parseStoredKey(storage.getItem(CREATION_KEY_STORAGE));
  if (stored?.fingerprint === fingerprint) return stored.key;
  const key = randomUuid();
  storage.setItem(CREATION_KEY_STORAGE, JSON.stringify({ fingerprint, key }));
  return key;
}

export function consumeExecutionCreationKey(
  fingerprint: string,
  key: string,
  storage: Pick<Storage, "getItem" | "removeItem"> = window.sessionStorage,
) {
  const stored = parseStoredKey(storage.getItem(CREATION_KEY_STORAGE));
  if (stored?.fingerprint === fingerprint && stored.key === key) storage.removeItem(CREATION_KEY_STORAGE);
}

export function executionCreationFingerprint(
  payload: ExecutionCreatePayload,
  sources: SourceRegistryRow[],
  projectConfigVersion: number | null,
  profileRevision: number | null,
) {
  return JSON.stringify({
    payload,
    project_config_version: projectConfigVersion,
    deployment_profile_revision: profileRevision,
    source_discovery: sources.map((source) => ({
      source_identifier: source.source_identifier,
      discovery_signature: source.discovery_signature,
    })),
  });
}

function parseStoredKey(value: string | null): { fingerprint: string; key: string } | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as { fingerprint?: unknown; key?: unknown };
    if (typeof candidate.fingerprint !== "string" || typeof candidate.key !== "string") return null;
    if (!/^[\x21-\x7e]{1,128}$/.test(candidate.key)) return null;
    return { fingerprint: candidate.fingerprint, key: candidate.key };
  } catch {
    return null;
  }
}
