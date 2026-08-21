"use client";

import Link from "next/link";
import type { Route } from "next";
import { Braces, Play, RadioTower, ServerCog } from "lucide-react";
import { Bar, EmptyRows, LiveIndicator, LoadingRows, MetricCell, QueryFailure, SectionHeading } from "@/shared/components/operator-ui";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatAge, formatSeconds, shortId } from "@/shared/lib/time";
import { metricByLabel, parsePrometheus, summarizeApiTraffic } from "@/shared/lib/prometheus";
import { useExecutions, useMetrics, useOverview, useReady, useWorkerPools } from "./queries";

export function OverviewView() {
  const overview = useOverview();
  const ready = useReady();
  const metrics = useMetrics();
  const executions = useExecutions("items_per_page=8");
  const pools = useWorkerPools();
  const fetching = [overview, ready, metrics, executions, pools].some((query) => query.isFetching);
  const samples = parsePrometheus(metrics.data ?? "");
  const traffic = summarizeApiTraffic(samples);
  const queued = metricByLabel(samples, "beampipe_jobs_queued", "kind").filter((item) => item.value > 0).sort((left, right) => right.value - left.value);
  const maxQueue = Math.max(1, ...queued.map((item) => item.value));

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase text-[var(--bp-subtle)]">Generated {formatAge(overview.data?.generated_at)}</p>
        <LiveIndicator fetching={fetching} />
      </div>

      <section className="mb-4 border border-[var(--bp-border)]">
        <SectionHeading title="Launchpad" />
        <div className="grid divide-y divide-[var(--bp-border-soft)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <LaunchAction href="/projects/new" icon={<Braces className="size-4" />} index="01" label="Project policy" value="YAML + visual" />
          <LaunchAction href="/profiles" icon={<ServerCog className="size-4" />} index="02" label="Deployment target" value="REST / Slurm" />
          <LaunchAction href="/sources" icon={<RadioTower className="size-4" />} index="03" label="Source registry" value={`${overview.data?.registered_sources ?? "--"} registered`} />
          <LaunchAction href="/runs/new" icon={<Play className="size-4" />} index="04" label="Compose run" value={`${overview.data?.pending_admissions ?? "--"} pending`} />
        </div>
      </section>

      <section className="mb-4 border border-[var(--bp-border)]">
        <SectionHeading title="Control plane" detail="readiness and external dependencies" />
        {overview.isError ? <QueryFailure message="Operator overview is unavailable" retry={() => overview.refetch()} /> : (
          <div className="grid grid-cols-2 divide-x divide-y divide-[var(--bp-border-soft)] md:grid-cols-3 xl:grid-cols-6">
            <Dependency name="service" status={ready.data?.status ?? (ready.isError ? "error" : "checking")} />
            <Dependency name="database" status={ready.data?.database ?? "checking"} />
            <Dependency name="CASDA" status={ready.data?.tap_casda ?? overview.data?.casda ?? "checking"} />
            <Dependency name="Vizier" status={ready.data?.tap_vizier ?? "checking"} />
            <Dependency name="DALiuGE" status={overview.data?.daliuge ?? "checking"} />
            <Dependency name="scheduler" status={overview.data?.scheduler ?? "checking"} />
          </div>
        )}
      </section>

      <section className="mb-4 grid grid-cols-2 border-t border-l border-[var(--bp-border)] md:grid-cols-4 xl:grid-cols-8">
        <MetricCell label="registered sources" value={overview.data?.registered_sources ?? "--"} />
        <MetricCell label="pending admission" value={overview.data?.pending_admissions ?? "--"} tone={(overview.data?.pending_admissions ?? 0) > 0 ? "caution" : "neutral"} />
        <MetricCell label="running" value={overview.data?.running_executions ?? "--"} tone="positive" />
        <MetricCell label="failed runs" value={overview.data?.failed_executions ?? "--"} tone={(overview.data?.failed_executions ?? 0) > 0 ? "negative" : "neutral"} />
        <MetricCell label="queue depth" value={overview.data?.queue_depth ?? "--"} tone={(overview.data?.queue_depth ?? 0) > 0 ? "caution" : "neutral"} />
        <MetricCell label="active workers" value={overview.data?.active_workers ?? "--"} tone="positive" />
        <MetricCell label="stale workers" value={overview.data?.stale_workers ?? "--"} tone={(overview.data?.stale_workers ?? 0) > 0 ? "negative" : "neutral"} />
        <Link className="contents" href={"/alerts" as Route}>
          <MetricCell label="recent alerts" value={overview.data?.recent_alerts ?? "--"} tone={(overview.data?.recent_alerts ?? 0) > 0 ? "negative" : "neutral"} />
        </Link>
      </section>

      <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <section className="min-w-0 border border-[var(--bp-border)]">
          <SectionHeading title="API traffic" detail="process lifetime counters; kept on operator overview" />
          {metrics.isError ? <QueryFailure message="Prometheus metrics are unavailable for this user" retry={() => metrics.refetch()} /> : (
            <>
              <div className="grid grid-cols-2 border-b border-[var(--bp-border-soft)] lg:grid-cols-4">
                <MetricCell label="requests" value={traffic.totalRequests.toLocaleString()} />
                <MetricCell label="server errors" value={traffic.serverErrors.toLocaleString()} tone={traffic.serverErrors > 0 ? "negative" : "positive"} />
                <MetricCell label="5xx ratio" value={`${(traffic.errorRate * 100).toFixed(2)}%`} tone={traffic.errorRate > 0.01 ? "negative" : "positive"} />
                <MetricCell label="mean latency" value={traffic.averageDurationSeconds == null ? "--" : formatSeconds(traffic.averageDurationSeconds)} />
              </div>
              <div className="divide-y divide-[var(--bp-border-soft)]">
                {traffic.routes.slice(0, 6).map((route) => (
                  <div className="grid grid-cols-[minmax(0,1fr)_72px_56px] items-center gap-3 px-3 py-2 text-[11px]" key={route.route}>
                    <div className="min-w-0"><p className="truncate text-[var(--bp-highlight)]">{route.route}</p><Bar max={Math.max(1, traffic.routes[0]?.requests ?? 1)} tone={route.serverErrors ? "red" : "cyan"} value={route.requests} /></div>
                    <span className="text-right tabular-nums text-[var(--bp-muted)]">{route.requests} req</span>
                    <span className={route.serverErrors ? "text-right text-[var(--bp-red)]" : "text-right text-[var(--bp-subtle)]"}>{route.serverErrors} 5xx</span>
                  </div>
                ))}
                {!traffic.routes.length ? <EmptyRows message="no API samples yet" /> : null}
              </div>
            </>
          )}
        </section>

        <section className="border border-[var(--bp-border)]">
          <SectionHeading title="Durable queue" detail="runnable jobs by kind" action={<Link className="text-[10px] uppercase text-[var(--bp-cyan)] hover:underline" href="/jobs">Open jobs</Link>} />
          {metrics.isLoading ? <LoadingRows rows={5} /> : queued.length ? (
            <div className="divide-y divide-[var(--bp-border-soft)]">
              {queued.slice(0, 8).map((item) => <div className="grid grid-cols-[minmax(0,1fr)_48px] items-center gap-3 px-3 py-2.5 text-[11px]" key={item.key}><div className="min-w-0"><p className="mb-1 truncate">{item.key}</p><Bar max={maxQueue} value={item.value} tone={item.value > 0 ? "amber" : "green"} /></div><span className="text-right tabular-nums">{item.value}</span></div>)}
            </div>
          ) : <EmptyRows message="queue empty" />}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <section className="min-w-0 border border-[var(--bp-border)]">
          <SectionHeading title="Latest runs" action={<Link className="text-[10px] uppercase text-[var(--bp-cyan)] hover:underline" href="/runs">All runs</Link>} />
          {executions.isLoading ? <LoadingRows /> : executions.isError ? <QueryFailure message="Runs could not be loaded" retry={() => executions.refetch()} /> : executions.data?.items.length ? (
            <div className="divide-y divide-[var(--bp-border-soft)]">
              {executions.data.items.map((execution) => <Link className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 hover:bg-[var(--bp-panel-soft)]" href={`/runs/${execution.uuid}` as Route} key={execution.uuid}><span className="text-[11px] text-[var(--bp-cyan)]">{shortId(execution.uuid)}</span><span className="min-w-0"><span className="block truncate text-xs">{execution.project_module}</span><span className="block truncate text-[10px] text-[var(--bp-subtle)]">{execution.execution_phase ?? "no phase"} / {formatAge(execution.created_at)}</span></span><StatusBadge status={execution.status} /></Link>)}
            </div>
          ) : <EmptyRows message="no runs recorded" />}
        </section>

        <section className="border border-[var(--bp-border)]">
          <SectionHeading title="Worker pools" action={<Link className="text-[10px] uppercase text-[var(--bp-cyan)] hover:underline" href="/workers">Inspect</Link>} />
          {pools.isLoading ? <LoadingRows /> : pools.isError ? <QueryFailure message="Worker pools unavailable" retry={() => pools.refetch()} /> : pools.data?.length ? (
            <div className="divide-y divide-[var(--bp-border-soft)]">
              {pools.data.map((pool) => <div className="px-3 py-2.5" key={pool.pool}><div className="mb-1 flex items-center justify-between gap-3 text-[11px]"><span>{pool.pool}</span><span className="tabular-nums text-[var(--bp-muted)]">{pool.active_leases}/{pool.concurrency_limit} slots</span></div><Bar max={Math.max(1, pool.concurrency_limit)} tone={pool.unhealthy_workers ? "red" : "green"} value={pool.active_leases} /><p className="mt-1 text-[10px] text-[var(--bp-subtle)]">{pool.active_workers} workers / {pool.unhealthy_workers} unhealthy / {pool.draining_workers} draining</p></div>)}
            </div>
          ) : <EmptyRows message="no workers registered" />}
        </section>
      </div>
    </div>
  );
}

function Dependency({ name, status }: { name: string; status: string }) {
  return <div className="flex min-h-14 min-w-0 items-center justify-between gap-2 px-3"><span className="truncate text-[10px] uppercase text-[var(--bp-subtle)]">{name}</span><StatusBadge status={status} /></div>;
}

function LaunchAction({ href, icon, index, label, value }: { href: string; icon: React.ReactNode; index: string; label: string; value: string }) {
  return <Link className="group flex min-h-16 min-w-0 items-center gap-3 px-3 py-3 hover:bg-[var(--bp-panel-soft)]" href={href as Route}><span className="text-[var(--bp-cyan)]">{icon}</span><span className="min-w-0"><span className="block text-[9px] uppercase text-[var(--bp-subtle)]">{index}</span><span className="block truncate text-xs text-[var(--bp-highlight)] group-hover:text-[var(--bp-cyan)]">{label}</span></span><span className="ml-auto truncate text-[10px] text-[var(--bp-muted)]">{value}</span></Link>;
}
