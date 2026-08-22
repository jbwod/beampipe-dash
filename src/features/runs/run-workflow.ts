import type { Execution, ExecutionCreatePayload } from "@/shared/types/beampipe";

const CREATION_KEY_STORAGE = "beampipe:execution-create";

export interface CreateExecutionStep {
  existing: Execution | null;
  create: () => Promise<Execution>;
  start?: (run: Execution) => Promise<unknown>;
  onCreated?: (run: Execution) => void;
}

export interface ExecutionCreationAttempt {
  fingerprint: string;
  payload: ExecutionCreatePayload;
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

export function abandonExecutionCreationKey(
  fingerprint: string,
  storage: Pick<Storage, "getItem" | "removeItem"> = window.sessionStorage,
) {
  const stored = parseStoredKey(storage.getItem(CREATION_KEY_STORAGE));
  if (stored?.fingerprint === fingerprint) storage.removeItem(CREATION_KEY_STORAGE);
}

export function executionCreationFingerprint(
  payload: ExecutionCreatePayload,
) {
  // Keep this in lockstep with Core's canonical_execution_create. Runtime
  // registry/config revisions are deliberately absent: they are resolved and
  // pinned by Core, but are not part of the create request's idempotency hash.
  return JSON.stringify({
    project_module: payload.project_module.trim(),
    sources: payload.sources.map((source) => ({
      source_identifier: source.source_identifier.trim(),
      sbids: source.sbids?.map((sbid) => sbid.trim()) ?? null,
    })),
    archive_name: payload.archive_name.trim(),
    deployment_profile_id: payload.deployment_profile_id ?? null,
    deployment_profile_name: payload.deployment_profile_name?.trim() ?? null,
  });
}

export function freezeExecutionCreationAttempt(payload: ExecutionCreatePayload): ExecutionCreationAttempt {
  const frozenPayload = structuredClone(payload);
  return {
    fingerprint: executionCreationFingerprint(frozenPayload),
    payload: frozenPayload,
  };
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
