import type { ExecutionStatusDetail } from "@/shared/types/beampipe";

type DaliugeStatusProjection = Pick<ExecutionStatusDetail, "daliuge_state" | "dim_state">;

export function resolveDaliugeState(
  current: DaliugeStatusProjection | null | undefined,
  persistedState: string | null | undefined,
) {
  return meaningfulState(current?.daliuge_state)
    ?? meaningfulState(current?.dim_state)
    ?? meaningfulState(persistedState);
}

function meaningfulState(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized !== "unknown" ? normalized : null;
}
