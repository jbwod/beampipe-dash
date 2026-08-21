"use client";

import Link from "next/link";
import type { Route } from "next";
import { DataTable, TableFrame, TableHead, Td, Th } from "@/shared/components/data-table";
import { Bar, EmptyRows, LiveIndicator, LoadingRows, MetricCell, QueryFailure, SectionHeading } from "@/shared/components/operator-ui";
import { StatusBadge } from "@/shared/components/status-badge";
import { metricByLabel, parsePrometheus } from "@/shared/lib/prometheus";
import { formatAge, formatSeconds, shortId } from "@/shared/lib/time";
import { useMetrics, useOverview, useSchedulerJobs, useWorkerLeases } from "./queries";

export function JobsView() {
  const overview = useOverview();
  const metrics = useMetrics();
  const leases = useWorkerLeases();
  const scheduler = useSchedulerJobs();
  const samples = parsePrometheus(metrics.data ?? "");
  const queued = metricByLabel(samples, "beampipe_jobs_queued", "kind").filter((item) => item.value > 0).sort((left, right) => right.value - left.value);
  const ages = new Map(metricByLabel(samples, "beampipe_jobs_oldest_queued_age_seconds", "kind").map((item) => [item.key, item.value]));
  const maxQueue = Math.max(1, ...queued.map((item) => item.value));

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex justify-end"><LiveIndicator fetching={[overview, metrics, leases, scheduler].some((query) => query.isFetching)} /></div>
      <section className="mb-4 grid grid-cols-2 border-t border-l border-[var(--bp-border)] md:grid-cols-4">
        <MetricCell label="queued" value={overview.data?.queue_depth ?? "--"} tone={(overview.data?.queue_depth ?? 0) > 0 ? "caution" : "positive"} />
        <MetricCell label="leased / running" value={leases.data?.length ?? "--"} tone="positive" />
        <MetricCell label="scheduler records" value={scheduler.data?.length ?? "--"} />
        <MetricCell label="oldest queued" value={formatSeconds(Math.max(0, ...ages.values()))} tone={Math.max(0, ...ages.values()) > 300 ? "negative" : "neutral"} />
      </section>

      <section className="mb-4 border border-[var(--bp-border)]">
        <SectionHeading title="Queue by kind" detail="runnable PostgreSQL durable jobs" />
        {metrics.isError ? <QueryFailure message="Queue metrics are unavailable" retry={() => metrics.refetch()} /> : metrics.isLoading ? <LoadingRows /> : queued.length ? (
          <div className="grid divide-y divide-[var(--bp-border-soft)] md:grid-cols-2 md:divide-x">
            {queued.map((item) => <div className="px-3 py-3" key={item.key}><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span>{item.key}</span><span className="tabular-nums text-[var(--bp-highlight)]">{item.value} queued</span></div><Bar max={maxQueue} tone={item.value > 0 ? "amber" : "green"} value={item.value} /><p className="mt-2 text-[10px] text-[var(--bp-subtle)]">oldest {formatSeconds(ages.get(item.key))}</p></div>)}
          </div>
        ) : <EmptyRows message="queue empty" />}
      </section>

      <section className="mb-4 border border-[var(--bp-border)]">
        <SectionHeading title="Active leases" detail="work currently owned by a worker" />
        {leases.isError ? <QueryFailure message="Worker leases are unavailable" retry={() => leases.refetch()} /> : (
          <TableFrame className="border-0">
            <DataTable><TableHead><tr><Th className="w-[150px]">Kind</Th><Th className="w-[132px]">Job</Th><Th>Execution</Th><Th className="w-[130px]">Pool</Th><Th className="w-[110px]">Attempts</Th><Th className="w-[130px]">Lease expiry</Th></tr></TableHead><tbody>
              {leases.data?.map((lease) => <tr className="hover:bg-[var(--bp-panel-soft)]" key={lease.job_id}><Td>{lease.kind}</Td><Td className="text-[var(--bp-cyan)]">{shortId(lease.job_id)}</Td><Td>{lease.execution_id ? <Link className="hover:underline" href={`/runs/${lease.execution_id}` as Route}>{shortId(lease.execution_id)}</Link> : "--"}</Td><Td>{lease.pool}</Td><Td className="tabular-nums">{lease.attempts}</Td><Td className="text-[10px] text-[var(--bp-muted)]">{formatAge(lease.lease_expires_at)}</Td></tr>)}
              {!leases.data?.length ? <tr><td colSpan={6}><EmptyRows message="no active leases" /></td></tr> : null}
            </tbody></DataTable>
          </TableFrame>
        )}
      </section>

      <section className="border border-[var(--bp-border)]">
        <SectionHeading title="Slurm submissions" detail="execution ledger scheduler projection" />
        {scheduler.isError ? <QueryFailure message="Slurm job projection is unavailable" retry={() => scheduler.refetch()} /> : (
          <TableFrame className="border-0">
            <DataTable><TableHead><tr><Th className="w-[130px]">Scheduler ID</Th><Th>Execution / project</Th><Th className="w-[145px]">Scheduler</Th><Th className="w-[145px]">Execution</Th><Th className="w-[130px]">Reconciled</Th></tr></TableHead><tbody>
              {scheduler.data?.map((job) => <tr className="hover:bg-[var(--bp-panel-soft)]" key={job.execution_id}><Td className="text-[var(--bp-cyan)]">{job.scheduler_job_id ?? "--"}</Td><Td><Link className="hover:underline" href={`/runs/${job.execution_id}` as Route}>{shortId(job.execution_id)}</Link><p className="text-[10px] text-[var(--bp-subtle)]">{job.project_module}</p></Td><Td><StatusBadge status={job.scheduler_state ?? job.scheduler_raw_state} /></Td><Td><StatusBadge status={job.execution_status} /></Td><Td className="text-[10px] text-[var(--bp-muted)]">{formatAge(job.last_reconciled_at)}</Td></tr>)}
              {!scheduler.data?.length ? <tr><td colSpan={5}><EmptyRows message="no Slurm submissions" /></td></tr> : null}
            </tbody></DataTable>
          </TableFrame>
        )}
      </section>
    </div>
  );
}
