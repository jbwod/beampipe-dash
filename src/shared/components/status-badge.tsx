import { cn } from "@/shared/lib/cn";

const positive = new Set(["ok", "ready", "healthy", "active", "running", "completed", "configured", "reachable", "enabled", "submitted", "staged", "verified", "valid", "complete", "settled", "new"]);
const caution = new Set(["pending", "queued", "retrying", "awaiting_scheduler", "draining", "warning", "profile_managed", "not_configured"]);
const negative = new Set(["error", "failed", "stale", "unhealthy", "cancelled", "disabled", "critical", "not_submitted", "blocked", "incomplete"]);

export function statusTone(status: string | null | undefined) {
  const normalized = status?.toLowerCase() ?? "unknown";
  if (positive.has(normalized)) return "positive" as const;
  if (caution.has(normalized)) return "caution" as const;
  if (negative.has(normalized)) return "negative" as const;
  return "neutral" as const;
}

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const normalized = status || "unknown";
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex h-5 max-w-full items-center gap-1.5 whitespace-nowrap border px-1.5 text-[10px] uppercase",
        tone === "positive" && "border-[var(--bp-green)]/40 text-[var(--bp-green)]",
        tone === "caution" && "border-[var(--bp-amber)]/40 text-[var(--bp-amber)]",
        tone === "negative" && "border-[var(--bp-red)]/40 text-[var(--bp-red)]",
        tone === "neutral" && "border-[var(--bp-border)] text-[var(--bp-muted)]",
        className,
      )}
    >
      <span aria-hidden="true">{tone === "positive" ? "+" : tone === "negative" ? "!" : tone === "caution" ? "~" : "."}</span>
      <span className="truncate">{normalized.replaceAll("_", " ")}</span>
    </span>
  );
}
