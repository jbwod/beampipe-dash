import type { Execution } from "@/shared/types/beampipe";

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
