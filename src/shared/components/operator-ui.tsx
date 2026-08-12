import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export function LiveIndicator({ fetching, label = "live / 5s" }: { fetching?: boolean; label?: string }) {
  return (
    <span className="inline-flex h-7 items-center gap-2 border border-[var(--bp-border)] px-2 text-[10px] uppercase text-[var(--bp-muted)]">
      <RefreshCw className={cn("size-3 text-[var(--bp-green)]", fetching && "animate-spin")} aria-hidden="true" />
      {label}
    </span>
  );
}

export function SectionHeading({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-10 items-center gap-3 border-b border-[var(--bp-border-soft)] px-3 py-2">
      <h2 className="text-[11px] font-semibold uppercase text-[var(--bp-highlight)]">[ {title} ]</h2>
      {detail ? <span className="hidden truncate text-[10px] text-[var(--bp-subtle)] sm:inline">{detail}</span> : null}
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </div>
  );
}

export function MetricCell({ label, value, detail, tone = "neutral" }: { label: string; value: React.ReactNode; detail?: string; tone?: "neutral" | "positive" | "caution" | "negative" }) {
  return (
    <div className="min-w-0 border-r border-b border-[var(--bp-border-soft)] p-3 last:border-r-0 sm:p-4">
      <p className="mb-2 truncate text-[10px] uppercase text-[var(--bp-subtle)]">{label}</p>
      <p className={cn("truncate text-2xl tabular-nums", tone === "positive" && "text-[var(--bp-green)]", tone === "caution" && "text-[var(--bp-amber)]", tone === "negative" && "text-[var(--bp-red)]")}>{value}</p>
      {detail ? <p className="mt-1 truncate text-[10px] text-[var(--bp-muted)]">{detail}</p> : null}
    </div>
  );
}

export function QueryFailure({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex min-h-24 items-center gap-3 border border-[var(--bp-red)]/40 px-3 py-4 text-xs text-[var(--bp-red)]">
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{message}</span>
      {retry ? <button className="border border-[var(--bp-red)]/50 px-2 py-1 text-[10px] uppercase hover:bg-[var(--bp-red)]/10" onClick={retry} type="button">Retry</button> : null}
    </div>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-label="Loading" className="divide-y divide-[var(--bp-border-soft)]">
      {Array.from({ length: rows }, (_, index) => <div className="h-10 animate-pulse bg-[var(--bp-panel-soft)]/40" key={index} />)}
    </div>
  );
}

export function EmptyRows({ message }: { message: string }) {
  return <div className="grid min-h-24 place-items-center px-3 py-8 text-center text-xs text-[var(--bp-subtle)]">[ {message} ]</div>;
}

export function Bar({ value, max, tone = "cyan" }: { value: number; max: number; tone?: "cyan" | "green" | "amber" | "red" }) {
  const width = max > 0 ? Math.min(100, Math.max(2, (value / max) * 100)) : 0;
  const color = { cyan: "var(--bp-cyan)", green: "var(--bp-green)", amber: "var(--bp-amber)", red: "var(--bp-red)" }[tone];
  return <span className="block h-1 w-full bg-[var(--bp-border-soft)]"><span className="block h-full" style={{ width: `${width}%`, backgroundColor: color }} /></span>;
}
