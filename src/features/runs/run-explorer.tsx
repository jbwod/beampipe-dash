"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { Tabs } from "@base-ui/react/tabs";
import { ChevronRight, Download, ExternalLink, FileJson2, GitBranch, PackageOpen } from "lucide-react";
import { JsonExplorer, downloadJson } from "@/shared/components/json-explorer";
import { EmptyRows, LiveIndicator, MetricCell, QueryFailure, SectionHeading } from "@/shared/components/operator-ui";
import { StatusBadge } from "@/shared/components/status-badge";
import { eagleUrlFromGraphUrl } from "@/shared/lib/eagle";
import { safeExternalUrl } from "@/shared/lib/http";
import { formatAge, formatDateTime, formatSeconds, shortId } from "@/shared/lib/time";
import type { ExecutionArtifact, ExecutionObservation, ProvenanceEvent } from "@/shared/types/beampipe";
import { isTerminal, useExecution, useExecutionArtifacts, useExecutionEvents, useExecutionObservations, useExecutionStatus, useExecutionSummary, useLedgerSnapshot } from "@/features/monitoring/queries";
import { RunActions } from "./run-actions";
import { resolveDaliugeState } from "./run-state";

const tabClass = "h-9 shrink-0 border-r border-[var(--bp-border-soft)] px-3 text-[10px] uppercase text-[var(--bp-muted)] hover:text-[var(--bp-text)] data-active:bg-[var(--bp-panel-soft)] data-active:text-[var(--bp-cyan)]";
const panelClass = "outline-none [[hidden]]:hidden";

export function RunExplorer({ id }: { id: string }) {
  const run = useExecution(id);
  const terminal = isTerminal(run.data?.status);
  const status = useExecutionStatus(id, terminal);
  const summary = useExecutionSummary(id, terminal);
  const events = useExecutionEvents(id, terminal);
  const observations = useExecutionObservations(id, terminal);
  const artifacts = useExecutionArtifacts(id, terminal);
  const ledger = useLedgerSnapshot(id, terminal);
  const queries = [run, status, summary, events, observations, artifacts, ledger];

  if (run.isError) return <div className="p-4 sm:p-6"><QueryFailure message="Run could not be loaded" retry={() => run.refetch()} /></div>;
  if (!run.data) return <div className="grid min-h-72 place-items-center text-xs text-[var(--bp-muted)]">[ loading execution ledger ]</div>;

  const phaseEntries = collectTimestamps(run.data.phase_timestamps);
  const current = status.data;
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 border border-[var(--bp-border)] p-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1"><div className="mb-1 flex flex-wrap items-center gap-2"><StatusBadge status={current?.status ?? run.data.status} /><span className="text-[10px] uppercase text-[var(--bp-subtle)]">{run.data.project_module}</span><span className="text-[10px] text-[var(--bp-border)]">/</span><span className="truncate text-[10px] text-[var(--bp-muted)]">{run.data.uuid}</span></div><p className="text-xs text-[var(--bp-highlight)]">{summary.data?.requested_source_count ?? sourceIdentifiers(run.data.sources).length} sources / {run.data.archive_name} / {formatSeconds(current?.duration_seconds)} elapsed / {run.data.retry_count} retries</p></div>
        <div className="flex items-start gap-3"><LiveIndicator fetching={queries.some((query) => query.isFetching)} label={terminal ? "terminal / manual refresh" : "live / 5s"} /><RunActions run={run.data} /></div>
      </div>

      {run.data.last_error ? <div className="mb-4 border-l-2 border-[var(--bp-red)] bg-[var(--bp-red)]/5 px-3 py-3"><p className="mb-1 text-[10px] uppercase text-[var(--bp-red)]">Last execution error</p><p className="text-xs leading-5 text-[var(--bp-highlight)]">{run.data.last_error}</p>{run.data.failure_class ? <p className="mt-1 text-[10px] text-[var(--bp-muted)]">class / {run.data.failure_class}</p> : null}</div> : null}

      <Tabs.Root defaultValue="overview">
        <Tabs.List className="flex overflow-x-auto border border-[var(--bp-border)] bg-black">
          <Tabs.Tab className={tabClass} value="overview">Overview</Tabs.Tab>
          <Tabs.Tab className={tabClass} value="timeline">Timeline <Count value={(events.data?.length ?? 0) + (observations.data?.length ?? 0)} /></Tabs.Tab>
          <Tabs.Tab className={tabClass} value="artifacts">Artifacts <Count value={artifacts.data?.length ?? 0} /></Tabs.Tab>
          <Tabs.Tab className={tabClass} value="data">Manifest + graph</Tabs.Tab>
          <Tabs.Tab className={tabClass} value="ledger">Ledger</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel className={panelClass} value="overview">
          <section className="mt-4 grid grid-cols-2 border-t border-l border-[var(--bp-border)] md:grid-cols-4 xl:grid-cols-6">
            <MetricCell label="control" value={<StatusBadge status={current?.control_phase ?? run.data.control_phase} />} />
            <MetricCell label="submission" value={<StatusBadge status={current?.submission_state ?? run.data.submission_state} />} />
            <MetricCell label="scheduler" value={<StatusBadge status={current?.slurm_state ?? current?.scheduler_state ?? run.data.scheduler_state ?? run.data.scheduler_name} />} />
            <MetricCell label="DALiuGE" value={<StatusBadge status={resolveDaliugeState(current, run.data.daliuge_state)} />} />
            <MetricCell label="output" value={<StatusBadge status={current?.output_state ?? run.data.output_state} />} />
            <MetricCell label="terminal" value={<StatusBadge status={current?.terminal_outcome ?? run.data.terminal_outcome} />} />
          </section>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <section className="border border-[var(--bp-border)]">
              <SectionHeading title="Execution path" detail="phase timestamps recorded by the ledger" />
              {phaseEntries.length ? <div className="divide-y divide-[var(--bp-border-soft)]">{phaseEntries.map((phase, index) => <div className="grid grid-cols-[24px_minmax(0,1fr)_180px] items-center gap-3 px-3 py-2.5 text-xs" key={`${phase.name}-${phase.at}`}><span className="text-[var(--bp-cyan)]">{String(index + 1).padStart(2, "0")}</span><span className="truncate">{phase.name.replaceAll("_", " ")}</span><span className="text-right text-[10px] text-[var(--bp-muted)]">{formatDateTime(phase.at)}</span></div>)}</div> : <EmptyRows message="no phase timestamps recorded" />}
            </section>

            <section className="border border-[var(--bp-border)]">
              <SectionHeading title="Pinned inputs" detail="immutable execution references" />
              <dl className="divide-y divide-[var(--bp-border-soft)]"><Field label="Project config" value={run.data.project_config_version ? `v${run.data.project_config_version} / ${shortId(run.data.project_config_id, 12)}` : "--"} /><Field label="Deployment profile" value={run.data.deployment_profile_id ? `${shortId(run.data.deployment_profile_id, 12)} / r${run.data.deployment_profile_revision ?? "?"}` : "--"} /><Field label="Discovery signature" value={shortId(run.data.discovery_signature, 18)} /><Field label="Manifest SHA-256" value={shortId(run.data.manifest_sha256, 18)} /><Field label="Patched graph SHA-256" value={shortId(run.data.patched_graph_sha256, 18)} /></dl>
            </section>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <section className="border border-[var(--bp-border)]"><SectionHeading title="Requested sources" detail={`${summary.data?.requested_source_count ?? 0} admitted to this batch`} /><div className="grid grid-cols-1 divide-y divide-[var(--bp-border-soft)] sm:grid-cols-2 sm:divide-x">{(summary.data?.requested_source_identifiers ?? sourceIdentifiers(run.data.sources)).map((source) => <div className="px-3 py-2.5 text-xs" key={source}><span className="mr-2 text-[var(--bp-cyan)]">+</span>{source}</div>)}</div></section>
            <section className="border border-[var(--bp-border)]"><SectionHeading title="Backend identity" /><dl className="divide-y divide-[var(--bp-border-soft)]"><Field label="Execution phase" value={current?.execution_phase ?? run.data.execution_phase} /><Field label="DALiuGE session" href={safeExternalUrl(run.data.dim_session_status_url) ?? undefined} value={run.data.daliuge_session_id} /><Field label="Scheduler job" value={run.data.scheduler_job_id} /><Field label="Remote session" value={run.data.slurm_session_dir ?? run.data.remote_session_dir} /><Field label="Last observation" value={`${formatDateTime(current?.last_observation_at)} / ${formatAge(current?.last_observation_at)}`} /><Field label="Last reconciled" value={`${formatDateTime(run.data.last_reconciled_at)} / ${formatAge(run.data.last_reconciled_at)}`} /></dl></section>
          </div>
        </Tabs.Panel>

        <Tabs.Panel className={panelClass} value="timeline"><Timeline events={events.data ?? []} observations={observations.data ?? []} /></Tabs.Panel>
        <Tabs.Panel className={panelClass} value="artifacts"><Artifacts artifacts={artifacts.data ?? []} runId={run.data.uuid} /></Tabs.Panel>
        <Tabs.Panel className={panelClass} value="data"><ExecutionData artifacts={artifacts.data ?? []} runId={run.data.uuid} workflowManifest={run.data.workflow_manifest} /></Tabs.Panel>
        <Tabs.Panel className={panelClass} value="ledger">
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <JsonExplorer filename={`${run.data.uuid}-ledger.json`} label="Compact ledger snapshot" value={ledger.data ?? null} />
            <JsonExplorer filename={`${run.data.uuid}-run-record.json`} label="Beampipe run record" value={run.data.beampipe_run_record ?? null} />
          </div>
          {ledger.isError ? <div className="mt-4"><QueryFailure message="Ledger snapshot is unavailable" retry={() => ledger.refetch()} /></div> : null}
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}

function Count({ value }: { value: number }) { return <span className="ml-1 text-[var(--bp-subtle)]">({value})</span>; }

function Field({ label, value, href }: { label: string; value: string | number | null | undefined; href?: string }) {
  return <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 px-3 py-2.5 text-[11px]"><dt className="text-[var(--bp-subtle)]">{label}</dt><dd className="min-w-0 truncate text-right text-[var(--bp-highlight)]">{href && value ? <a className="inline-flex max-w-full items-center gap-1 text-[var(--bp-cyan)] hover:underline" href={href} rel="noreferrer" target="_blank"><span className="truncate">{value}</span><ExternalLink className="size-3 shrink-0" /></a> : value || "--"}</dd></div>;
}

function Timeline({ events, observations }: { events: ProvenanceEvent[]; observations: ExecutionObservation[] }) {
  const entries = [
    ...events.map((event) => ({ id: event.id, at: event.occurred_at, kind: "event", label: event.event_type, state: event.actor, detail: event.source_identifier, payload: event.payload })),
    ...observations.map((observation) => ({ id: observation.uuid, at: observation.observed_at, kind: "observation", label: observation.kind, state: observation.normalized_state, detail: observation.reason ?? observation.raw_state, payload: observation.payload })),
  ].sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
  return <section className="mt-4 border border-[var(--bp-border)]"><SectionHeading title="Provenance + observations" detail="newest external and control-plane evidence first" />{entries.length ? <div className="divide-y divide-[var(--bp-border-soft)]">{entries.map((entry) => <Collapsible.Root key={`${entry.kind}-${entry.id}`}><Collapsible.Trigger className="group grid w-full grid-cols-[22px_minmax(0,1fr)_140px] items-center gap-3 px-3 py-3 text-left hover:bg-[var(--bp-panel-soft)]"><ChevronRight className="size-3 text-[var(--bp-cyan)] group-data-panel-open:rotate-90" /><span className="min-w-0"><span className="block truncate text-xs">{entry.label.replaceAll("_", " ")}</span><span className="block truncate text-[10px] text-[var(--bp-subtle)]">{entry.kind} / {entry.state ?? "no actor"}{entry.detail ? ` / ${entry.detail}` : ""}</span></span><span className="text-right text-[10px] text-[var(--bp-muted)]">{formatDateTime(entry.at)}<br />{formatAge(entry.at)}</span></Collapsible.Trigger><Collapsible.Panel className="overflow-hidden bg-[var(--bp-panel-soft)] px-3 pb-3 [&[hidden]]:hidden"><JsonExplorer label={`${entry.label} payload`} value={entry.payload} /></Collapsible.Panel></Collapsible.Root>)}</div> : <EmptyRows message="no provenance or observations recorded" />}</section>;
}

function Artifacts({ artifacts, runId }: { artifacts: ExecutionArtifact[]; runId: string }) {
  return <section className="mt-4 border border-[var(--bp-border)]"><SectionHeading title="Immutable artifacts" detail="content-addressed execution products" />{artifacts.length ? <div className="divide-y divide-[var(--bp-border-soft)]">{artifacts.map((artifact) => { const artifactUrl = safeExternalUrl(artifact.uri); return <Collapsible.Root key={artifact.uuid}><Collapsible.Trigger className="group grid w-full gap-3 px-3 py-3 text-left hover:bg-[var(--bp-panel-soft)] sm:grid-cols-[22px_180px_minmax(0,1fr)_120px_120px]"><ChevronRight className="size-3 text-[var(--bp-cyan)] group-data-panel-open:rotate-90" /><span className="text-xs">{artifact.kind}</span><span className="truncate text-[10px] text-[var(--bp-muted)]">{artifact.sha256}</span><span className="text-[10px] text-[var(--bp-subtle)]">{formatBytes(artifact.size_bytes)}</span><span className="text-[10px] text-[var(--bp-subtle)]">{artifact.producer_phase}</span></Collapsible.Trigger><Collapsible.Panel className="overflow-hidden bg-[var(--bp-panel-soft)] px-3 pb-3 [&[hidden]]:hidden"><div className="mb-2 grid gap-2 py-2 text-[10px] text-[var(--bp-muted)] sm:grid-cols-3"><span>storage / {artifact.storage_kind}</span><span>media / {artifact.media_type}</span><span>created / {formatDateTime(artifact.created_at)}</span></div>{artifactUrl ? <a className="mb-2 inline-flex items-center gap-1 text-[10px] text-[var(--bp-cyan)] hover:underline" href={artifactUrl} rel="noreferrer" target="_blank">Open artifact URI <ExternalLink className="size-3" /></a> : null}<div className="grid gap-3 xl:grid-cols-2"><JsonExplorer filename={`${runId}-${artifact.kind}.json`} label={`${artifact.kind} content`} value={artifact.inline_json} /><JsonExplorer label={`${artifact.kind} metadata`} value={artifact.metadata} /></div></Collapsible.Panel></Collapsible.Root>; })}</div> : <EmptyRows message="no immutable artifacts recorded" />}</section>;
}

function ExecutionData({ artifacts, runId, workflowManifest }: { artifacts: ExecutionArtifact[]; runId: string; workflowManifest: unknown }) {
  const relevant = artifacts.filter((artifact) => ["manifest", "source_graph", "patched_graph", "physical_graph"].includes(artifact.kind));
  return <div className="mt-4 space-y-4">{relevant.map((artifact) => { const eagle = artifact.uri ? eagleUrlFromGraphUrl(artifact.uri, process.env.NEXT_PUBLIC_EAGLE_URL) : null; const graph = artifact.kind.includes("graph"); return <section className="border border-[var(--bp-border)]" key={artifact.uuid}><SectionHeading title={artifact.kind.replaceAll("_", " ")} detail={shortId(artifact.sha256, 16)} action={<div className="flex gap-2">{eagle ? <a className="inline-flex h-7 items-center gap-1 border border-[var(--bp-cyan)] px-2 text-[10px] uppercase text-[var(--bp-cyan)]" href={eagle} rel="noreferrer" target="_blank"><GitBranch className="size-3" />EAGLE</a> : null}<button className="inline-flex h-7 items-center gap-1 border border-[var(--bp-border)] px-2 text-[10px] uppercase text-[var(--bp-muted)] hover:text-[var(--bp-cyan)]" onClick={() => downloadJson(`${runId}-${artifact.kind}${graph ? ".graph" : ".json"}`, artifact.inline_json)} type="button"><Download className="size-3" />Download</button></div>} /><div className="p-3"><JsonExplorer label={artifact.kind} value={artifact.inline_json} /></div></section>; })}{!relevant.length && workflowManifest ? <section className="border border-[var(--bp-border)]"><SectionHeading title="Workflow manifest" /><div className="p-3"><JsonExplorer filename={`${runId}-workflow-manifest.json`} value={workflowManifest} /></div></section> : null}{!relevant.length && !workflowManifest ? <div className="border border-[var(--bp-border)]"><EmptyRows message="manifest and graph artifacts not generated" /></div> : null}<div className="grid gap-3 border border-[var(--bp-border)] p-3 text-[11px] text-[var(--bp-muted)] sm:grid-cols-3"><span className="inline-flex items-center gap-2"><FileJson2 className="size-3 text-[var(--bp-cyan)]" />Logical graph is EAGLE-compatible</span><span className="inline-flex items-center gap-2"><GitBranch className="size-3 text-[var(--bp-cyan)]" />Patched graph is submitted</span><span className="inline-flex items-center gap-2"><PackageOpen className="size-3 text-[var(--bp-cyan)]" />Physical graph is translator output</span></div></div>;
}

function collectTimestamps(value: unknown, prefix = ""): Array<{ name: string; at: string }> {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string" && !Number.isNaN(new Date(child).getTime())) return [{ name, at: child }];
    return collectTimestamps(child, name);
  }).sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());
}

function sourceIdentifiers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((source) => typeof source === "string" ? source : source && typeof source === "object" ? (source as Record<string, unknown>).source_identifier : null).filter((source): source is string => typeof source === "string");
}

function formatBytes(value: number | null) {
  if (value == null) return "--";
  if (value < 1_024) return `${value} B`;
  if (value < 1_048_576) return `${(value / 1_024).toFixed(1)} KiB`;
  return `${(value / 1_048_576).toFixed(1)} MiB`;
}
