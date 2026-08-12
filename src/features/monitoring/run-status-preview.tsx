"use client";

import { LiveIndicator, MetricCell, QueryFailure, SectionHeading } from "@/shared/components/operator-ui";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDateTime, shortId } from "@/shared/lib/time";
import { useExecution } from "./queries";

export function RunStatusPreview({ id }: { id: string }) {
  const run = useExecution(id);
  if (run.isError) return <div className="p-4 sm:p-6"><QueryFailure message="Run could not be loaded" retry={() => run.refetch()} /></div>;
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex justify-end"><LiveIndicator fetching={run.isFetching} /></div>
      <section className="border border-[var(--bp-border)]">
        <SectionHeading title="Run status" detail={run.data ? shortId(run.data.uuid) : "loading"} />
        <div className="grid grid-cols-2 border-l border-t border-[var(--bp-border-soft)] lg:grid-cols-4">
          <MetricCell label="status" value={<StatusBadge status={run.data?.status} />} />
          <MetricCell label="execution phase" value={<span className="text-sm">{run.data?.execution_phase ?? "--"}</span>} />
          <MetricCell label="backend" value={<span className="text-sm">{run.data?.scheduler_name ?? "REST / DIM"}</span>} />
          <MetricCell label="retry count" value={run.data?.retry_count ?? "--"} />
        </div>
        <dl className="grid gap-px bg-[var(--bp-border-soft)] text-xs md:grid-cols-2">
          <PreviewField label="Project" value={run.data?.project_module} />
          <PreviewField label="Created" value={formatDateTime(run.data?.created_at)} />
          <PreviewField label="DALiuGE session" value={run.data?.daliuge_session_id} />
          <PreviewField label="Scheduler job" value={run.data?.scheduler_job_id} />
        </dl>
      </section>
      <p className="mt-4 border-l-2 border-[var(--bp-cyan)] pl-3 text-xs leading-5 text-[var(--bp-muted)]">Full ledger, provenance, manifest, graph, observations, artifacts, and recovery controls are added in the execution explorer feature.</p>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="min-w-0 bg-[var(--bp-bg)] px-3 py-3"><dt className="mb-1 text-[10px] uppercase text-[var(--bp-subtle)]">{label}</dt><dd className="truncate">{value || "--"}</dd></div>;
}
