import type { Execution, ExecutionStatusDetail } from "@/shared/types/beampipe";

type DaliugeStatusProjection = Pick<ExecutionStatusDetail, "daliuge_state" | "dim_state">;
type OutputStatusProjection = Pick<Execution, "output_state" | "output_verification_required">;

export function resolveDaliugeState(
  current: DaliugeStatusProjection | null | undefined,
  persistedState: string | null | undefined,
) {
  return meaningfulState(current?.daliuge_state)
    ?? meaningfulState(current?.dim_state)
    ?? meaningfulState(persistedState);
}

export function resolveOutputState(
  currentState: string | null | undefined,
  execution: OutputStatusProjection,
) {
  if (execution.output_verification_required === false) return "not_required";
  return meaningfulState(currentState) ?? meaningfulState(execution.output_state);
}

function meaningfulState(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized !== "unknown" ? normalized : null;
}
