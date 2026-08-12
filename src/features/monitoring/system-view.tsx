"use client";

import { CheckCircle2, TerminalSquare, TriangleAlert } from "lucide-react";
import { EmptyRows, LiveIndicator, MetricCell, QueryFailure, SectionHeading } from "@/shared/components/operator-ui";
import { StatusBadge } from "@/shared/components/status-badge";
import { metricValue, parsePrometheus } from "@/shared/lib/prometheus";
import { formatAge } from "@/shared/lib/time";
import { useDiagnostics, useMetrics, useOverview, useReady } from "./queries";

export function SystemView() {
  const ready = useReady();
  const diagnostics = useDiagnostics();
  const overview = useOverview();
  const metrics = useMetrics();
  const samples = parsePrometheus(metrics.data ?? "");
  const risk = metricValue(samples, "beampipe_reconciliation_risk_executions");
  const retries = metricValue(samples, "beampipe_execution_retries_total");
  const ssh = metricValue(samples, "beampipe_slurm_ssh_configured");

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3"><p className="text-[10px] uppercase text-[var(--bp-subtle)]">Diagnostics generated {formatAge(diagnostics.data?.generated_at)}</p><LiveIndicator fetching={[ready, diagnostics, overview, metrics].some((query) => query.isFetching)} label="live / 15s" /></div>
      <section className="mb-4 border border-[var(--bp-border)]">
        <SectionHeading title="Readiness" detail="process, storage, archive, and runtime posture" />
        {ready.isError ? <QueryFailure message="Readiness probe failed" retry={() => ready.refetch()} /> : <div className="grid grid-cols-2 divide-x divide-y divide-[var(--bp-border-soft)] md:grid-cols-4"><SystemCheck label="service" status={ready.data?.status} detail={ready.data?.service} /><SystemCheck label="PostgreSQL" status={ready.data?.database} /><SystemCheck label="CASDA TAP" status={ready.data?.tap_casda} /><SystemCheck label="Vizier TAP" status={ready.data?.tap_vizier} /><SystemCheck label="DALiuGE" status={overview.data?.daliuge} /><SystemCheck label="scheduler" status={overview.data?.scheduler} /><SystemCheck label="Redis" status={ready.data?.redis} detail="optional limiter" /><SystemCheck label="job runtime" status={ready.data ? "ready" : undefined} detail={`${ready.data?.jobs_running ?? 0} running / ${ready.data?.queue_depth ?? 0} queued`} /></div>}
      </section>

      <section className="mb-4 grid grid-cols-2 border-t border-l border-[var(--bp-border)] md:grid-cols-4">
        <MetricCell label="diagnostics" value={diagnostics.data?.diagnostics.length ?? "--"} tone={(diagnostics.data?.diagnostics.length ?? 0) ? "caution" : "positive"} />
        <MetricCell label="reconciliation risk" value={risk} tone={risk ? "negative" : "positive"} />
        <MetricCell label="execution retries" value={retries} tone={retries ? "caution" : "neutral"} />
        <MetricCell label="Slurm SSH" value={metrics.isError ? "--" : ssh ? "configured" : "not configured"} tone={ssh ? "positive" : "caution"} />
      </section>

      <section className="mb-4 border border-[var(--bp-border)]">
        <SectionHeading title="Operator diagnostics" detail="actionable checks; sensitive values are redacted by Beampipe" />
        {diagnostics.isError ? <QueryFailure message="Detailed diagnostics are unavailable" retry={() => diagnostics.refetch()} /> : diagnostics.data?.diagnostics.length ? <div className="divide-y divide-[var(--bp-border-soft)]">{diagnostics.data.diagnostics.map((diagnostic, index) => <div className="grid gap-2 px-3 py-3 sm:grid-cols-[120px_180px_minmax(0,1fr)]" key={`${diagnostic.code}-${index}`}><div><StatusBadge status={diagnostic.severity} /></div><div><p className="text-[11px] text-[var(--bp-highlight)]">{diagnostic.path ?? "system"}</p><p className="truncate text-[10px] text-[var(--bp-subtle)]">{diagnostic.code}</p></div><div><p className="text-xs leading-5">{diagnostic.message}</p>{diagnostic.hint ? <p className="mt-1 text-[10px] leading-4 text-[var(--bp-amber)]">action: {diagnostic.hint}</p> : null}</div></div>)}</div> : <div className="flex min-h-28 items-center justify-center gap-2 text-xs text-[var(--bp-green)]"><CheckCircle2 className="size-4" />No operator diagnostics</div>}
      </section>

      <section className="border border-[var(--bp-border)]">
        <SectionHeading title="Useful probes" detail="equivalent binary and HTTP checks" />
        <div className="grid divide-y divide-[var(--bp-border-soft)] lg:grid-cols-2 lg:divide-x lg:divide-y-0"><Probe icon={<TerminalSquare className="size-4" />} label="Full runtime check" command="beampipe doctor --profile <name>" /><Probe icon={<TriangleAlert className="size-4" />} label="Production security policy" command="beampipe security check" /></div>
        {!ready.data && !diagnostics.data ? <EmptyRows message="waiting for system state" /> : null}
      </section>
    </div>
  );
}

function SystemCheck({ label, status, detail }: { label: string; status?: string; detail?: string }) {
  return <div className="min-w-0 px-3 py-3"><div className="mb-2 flex items-center justify-between gap-2"><span className="truncate text-[10px] uppercase text-[var(--bp-subtle)]">{label}</span><StatusBadge status={status ?? "checking"} /></div>{detail ? <p className="truncate text-[10px] text-[var(--bp-muted)]">{detail}</p> : null}</div>;
}

function Probe({ icon, label, command }: { icon: React.ReactNode; label: string; command: string }) {
  return <div className="flex items-center gap-3 px-3 py-4"><span className="text-[var(--bp-cyan)]">{icon}</span><div className="min-w-0"><p className="mb-1 text-xs">{label}</p><code className="block truncate text-[10px] text-[var(--bp-muted)]">$ {command}</code></div></div>;
}
