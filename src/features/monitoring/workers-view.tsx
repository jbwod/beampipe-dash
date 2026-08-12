"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pause, Play } from "lucide-react";
import { DataTable, TableFrame, TableHead, Td, Th } from "@/shared/components/data-table";
import { Bar, EmptyRows, LiveIndicator, MetricCell, QueryFailure, SectionHeading } from "@/shared/components/operator-ui";
import { StatusBadge } from "@/shared/components/status-badge";
import { dashboardFetch } from "@/shared/lib/http";
import { formatAge, formatSeconds, shortId } from "@/shared/lib/time";
import type { Worker } from "@/shared/types/beampipe";
import { useCurrentUser, useWorkerLeases, useWorkerPools, useWorkers } from "./queries";

export function WorkersView() {
  const workers = useWorkers();
  const pools = useWorkerPools();
  const leases = useWorkerLeases();
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const drain = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "drain" | "resume" }) => dashboardFetch<Worker>(`/api/beampipe/workers/${id}/${action}`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workers"] }),
  });
  const totalCapacity = pools.data?.reduce((sum, pool) => sum + pool.concurrency_limit, 0) ?? 0;
  const activeLeases = pools.data?.reduce((sum, pool) => sum + pool.active_leases, 0) ?? 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex justify-end"><LiveIndicator fetching={[workers, pools, leases].some((query) => query.isFetching)} /></div>
      <section className="mb-4 grid grid-cols-2 border-t border-l border-[var(--bp-border)] md:grid-cols-4">
        <MetricCell label="active workers" value={workers.data?.filter((worker) => worker.health === "healthy").length ?? "--"} tone="positive" />
        <MetricCell label="degraded workers" value={workers.data?.filter((worker) => worker.health !== "healthy").length ?? "--"} tone={(workers.data?.some((worker) => worker.health !== "healthy")) ? "negative" : "neutral"} />
        <MetricCell label="active leases" value={activeLeases} />
        <MetricCell label="slot use" value={totalCapacity ? `${activeLeases}/${totalCapacity}` : "--"} detail={totalCapacity ? `${Math.round((activeLeases / totalCapacity) * 100)}% utilized` : "no capacity registered"} />
      </section>

      <section className="mb-4 border border-[var(--bp-border)]">
        <SectionHeading title="Pools" detail="capability isolation and concurrency" />
        {pools.isError ? <QueryFailure message="Worker pools are unavailable" retry={() => pools.refetch()} /> : pools.data?.length ? <div className="grid divide-y divide-[var(--bp-border-soft)] lg:grid-cols-2 lg:divide-x">{pools.data.map((pool) => <div className="px-3 py-3" key={pool.pool}><div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs">{pool.pool}</span><span className="text-[10px] tabular-nums text-[var(--bp-muted)]">{pool.active_leases}/{pool.concurrency_limit} leased</span></div><Bar max={Math.max(1, pool.concurrency_limit)} tone={pool.unhealthy_workers ? "red" : "green"} value={pool.active_leases} /><div className="mt-2 flex gap-4 text-[10px] text-[var(--bp-subtle)]"><span>{pool.active_workers} active</span><span>{pool.draining_workers} draining</span><span>{pool.unhealthy_workers} unhealthy</span></div></div>)}</div> : <EmptyRows message="no worker pools" />}
      </section>

      <section className="mb-4 border border-[var(--bp-border)]">
        <SectionHeading title="Instances" detail="heartbeat and current ownership" />
        {workers.isError ? <QueryFailure message="Workers are unavailable" retry={() => workers.refetch()} /> : (
          <TableFrame className="border-0"><DataTable><TableHead><tr><Th>Instance / host</Th><Th className="w-[150px]">Pool / role</Th><Th className="w-[132px]">Health</Th><Th className="w-[128px]">Leases</Th><Th className="w-[138px]">Heartbeat</Th><Th className="w-[64px]"><span className="sr-only">Actions</span></Th></tr></TableHead><tbody>
            {workers.data?.map((worker) => <tr className="hover:bg-[var(--bp-panel-soft)]" key={worker.id}><Td><p className="truncate">{worker.instance_name}</p><p className="truncate text-[10px] text-[var(--bp-subtle)]">{worker.host} / pid {worker.process_id ?? "--"} / v{worker.version}</p></Td><Td><p>{worker.pool}</p><p className="text-[10px] text-[var(--bp-subtle)]">{worker.role}</p></Td><Td><StatusBadge status={worker.health} /></Td><Td><span className="tabular-nums">{worker.active_leases}/{worker.concurrency_limit}</span></Td><Td><p className={worker.health === "stale" ? "text-[var(--bp-red)]" : "text-[var(--bp-muted)]"}>{formatSeconds(worker.heartbeat_age_seconds)}</p><p className="text-[10px] text-[var(--bp-subtle)]">{formatAge(worker.last_heartbeat_at)}</p></Td><Td>{currentUser.data?.is_superuser ? <button aria-label={worker.status === "draining" ? `Resume ${worker.instance_name}` : `Drain ${worker.instance_name}`} className="grid size-7 place-items-center border border-[var(--bp-border)] text-[var(--bp-muted)] hover:border-[var(--bp-cyan)] hover:text-[var(--bp-cyan)] disabled:opacity-40" disabled={drain.isPending} onClick={() => drain.mutate({ id: worker.id, action: worker.status === "draining" ? "resume" : "drain" })} title={worker.status === "draining" ? "Resume worker" : "Drain worker"} type="button">{worker.status === "draining" ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}</button> : null}</Td></tr>)}
            {!workers.data?.length ? <tr><td colSpan={6}><EmptyRows message="no workers registered" /></td></tr> : null}
          </tbody></DataTable></TableFrame>
        )}
        {drain.isError ? <p className="border-t border-[var(--bp-red)]/40 px-3 py-2 text-[11px] text-[var(--bp-red)]">Worker state change failed: {drain.error.message}</p> : null}
      </section>

      <section className="border border-[var(--bp-border)]">
        <SectionHeading title="Lease map" detail="job to worker assignment" />
        <div className="divide-y divide-[var(--bp-border-soft)]">
          {leases.data?.map((lease) => <div className="grid gap-2 px-3 py-2.5 text-[11px] sm:grid-cols-[150px_100px_minmax(0,1fr)_130px]" key={lease.job_id}><span>{lease.kind}</span><span className="text-[var(--bp-cyan)]">{shortId(lease.job_id)}</span><span className="truncate text-[var(--bp-muted)]">worker {shortId(lease.worker_id)} / execution {shortId(lease.execution_id)}</span><span className="text-right text-[10px] text-[var(--bp-subtle)]">expires {formatAge(lease.lease_expires_at)}</span></div>)}
          {!leases.data?.length ? <EmptyRows message="no active leases" /> : null}
        </div>
      </section>
    </div>
  );
}
