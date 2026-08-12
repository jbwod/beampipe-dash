"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Radio, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionDialog } from "@/shared/components/action-dialog";
import { EmptyRows, LoadingRows, QueryFailure, SectionHeading } from "@/shared/components/operator-ui";
import { StatusBadge } from "@/shared/components/status-badge";
import { dashboardFetch } from "@/shared/lib/http";
import { formatAge, formatDateTime, shortId } from "@/shared/lib/time";
import { useSource, useSourceEvents, useSourceExecutions, useSourceMetadata, useSourceStatus } from "@/features/monitoring/queries";
import { sourceState } from "@/features/monitoring/sources-view";

const tabClass = "h-9 shrink-0 border-r border-[var(--bp-border-soft)] px-3 text-[10px] uppercase text-[var(--bp-muted)] data-active:bg-[var(--bp-panel-soft)] data-active:text-[var(--bp-cyan)]";

export function SourceExplorer({ id }: { id: string }) {
  const source = useSource(id);
  const status = useSourceStatus(id);
  const metadata = useSourceMetadata(id);
  const executions = useSourceExecutions(id);
  const events = useSourceEvents(id);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [staleHours, setStaleHours] = useState<number | null | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: (kind: "save" | "discover" | "delete") => kind === "save"
      ? dashboardFetch(`/api/beampipe/sources/${id}`, { method: "PATCH", body: JSON.stringify({ enabled: enabled ?? source.data?.enabled, stale_after_hours: staleHours === undefined ? source.data?.stale_after_hours : staleHours }) })
      : kind === "discover"
        ? dashboardFetch("/api/beampipe/sources/discover", { method: "POST", body: JSON.stringify({ project_module: source.data?.project_module, source_identifier: source.data?.source_identifier }) })
        : dashboardFetch(`/api/beampipe/sources/${id}`, { method: "DELETE" }),
    onSuccess: async (_, kind) => {
      if (kind === "delete") { router.push("/sources"); return; }
      setEnabled(null);
      setStaleHours(undefined);
      await queryClient.invalidateQueries({ predicate: (query) => query.queryKey.includes(id) || query.queryKey[0] === "sources" });
    },
  });

  if (source.isPending) return <div className="p-4 sm:p-6"><LoadingRows rows={7} /></div>;
  if (source.isError) return <div className="p-4 sm:p-6"><QueryFailure message="Source could not be loaded" retry={() => source.refetch()} /></div>;
  const row = source.data;
  const dirty = enabled != null || staleHours !== undefined;

  return <div className="p-4 sm:p-6">
    <div className="mb-4 flex flex-wrap items-start gap-3 border border-[var(--bp-border)] bg-[var(--bp-panel)] p-3"><div className="mr-auto min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-[var(--bp-highlight)]">{row.source_identifier}</h2><StatusBadge status={sourceState(row)} /><StatusBadge status={status.data?.ready_for_execution ? "ready" : "blocked"} /></div><p className="text-[10px] text-[var(--bp-subtle)]">{row.project_module} / {shortId(row.uuid, 18)}</p></div><button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-cyan)]/60 px-2 text-[10px] uppercase text-[var(--bp-cyan)]" disabled={mutation.isPending} onClick={() => mutation.mutate("discover")} type="button"><Radio className="size-3" />Rediscover</button><button aria-label="Delete source" className="grid size-8 place-items-center border border-[var(--bp-red)]/50 text-[var(--bp-red)]" onClick={() => setDeleteOpen(true)} title="Delete source" type="button"><Trash2 className="size-3.5" /></button></div>
    {mutation.isError ? <p className="mb-4 border-l-2 border-[var(--bp-red)] px-3 py-2 text-xs text-[var(--bp-red)]">{mutation.error.message}</p> : null}

    <section className="mb-4 border border-[var(--bp-border)]"><SectionHeading detail={status.data?.ready_for_execution ? "all readiness gates pass" : `${status.data?.blockers.length ?? 0} blocker(s)`} title="Execution readiness" />{status.isPending ? <LoadingRows rows={2} /> : <div className="grid divide-y divide-[var(--bp-border-soft)] sm:grid-cols-4 sm:divide-x sm:divide-y-0"><Readiness label="Discovery" status={status.data?.discovery_complete ? "complete" : "incomplete"} /><Readiness label="Workflow" status={status.data?.workflow_run_pending ? "pending" : "settled"} /><Readiness label="Signature" status={status.data?.signature_matches_last_execution ? "already executed" : "new"} /><Readiness label="Admission" status={status.data?.ready_for_execution ? "ready" : "blocked"} /></div>}{status.data?.blockers.length ? <div className="divide-y divide-[var(--bp-border-soft)] border-t border-[var(--bp-border)]">{status.data.blockers.map((blocker) => <p className="px-3 py-2 text-[10px] leading-5 text-[var(--bp-amber)]" key={blocker}>! {blocker}</p>)}</div> : null}</section>

    <div className="border border-[var(--bp-border)]"><Tabs.Root defaultValue="metadata"><Tabs.List className="flex overflow-x-auto border-b border-[var(--bp-border)]"><Tabs.Tab className={tabClass} value="metadata">Metadata / {metadata.data?.metadata_count ?? 0}</Tabs.Tab><Tabs.Tab className={tabClass} value="executions">Runs / {executions.data?.length ?? 0}</Tabs.Tab><Tabs.Tab className={tabClass} value="events">Events / {events.data?.length ?? 0}</Tabs.Tab><Tabs.Tab className={tabClass} value="settings">Settings</Tabs.Tab></Tabs.List>
      <Tabs.Panel className="p-3 outline-none" value="metadata">{metadata.data?.metadata.length ? <div className="space-y-3">{metadata.data.metadata.map((record) => <details className="border border-[var(--bp-border-soft)]" key={record.uuid}><summary className="cursor-pointer px-3 py-2 text-xs text-[var(--bp-cyan)]">SBID {record.sbid}<span className="float-right text-[10px] text-[var(--bp-subtle)]">{formatAge(record.updated_at ?? record.created_at)}</span></summary><pre className="max-h-[520px] overflow-auto border-t border-[var(--bp-border-soft)] bg-black p-3 text-[10px] leading-5 text-[var(--bp-muted)]">{JSON.stringify(record.metadata_json, null, 2)}</pre></details>)}</div> : <EmptyRows message="no archive metadata" />}</Tabs.Panel>
      <Tabs.Panel className="outline-none" value="executions">{executions.data?.length ? <div className="divide-y divide-[var(--bp-border-soft)]">{executions.data.map((run) => <Link className="grid gap-2 px-3 py-3 hover:bg-[var(--bp-panel-soft)] sm:grid-cols-[120px_1fr_140px_180px]" href={`/runs/${run.uuid}` as Route} key={run.uuid}><span className="text-[var(--bp-cyan)]">{shortId(run.uuid)}</span><span>{run.execution_phase ?? run.control_phase ?? "created"}</span><StatusBadge status={run.status} /><span className="text-[10px] text-[var(--bp-muted)]">{formatDateTime(run.created_at)}</span></Link>)}</div> : <EmptyRows message="no linked executions" />}</Tabs.Panel>
      <Tabs.Panel className="outline-none" value="events">{events.data?.length ? <div className="divide-y divide-[var(--bp-border-soft)]">{events.data.map((event) => <div className="grid gap-2 px-3 py-3 sm:grid-cols-[180px_1fr_180px]" key={event.id}><span className="text-[var(--bp-cyan)]">{event.event_type}</span><span className="truncate text-[10px] text-[var(--bp-muted)]">{JSON.stringify(event.payload)}</span><span className="text-[10px] text-[var(--bp-subtle)]">{formatDateTime(event.occurred_at)}</span></div>)}</div> : <EmptyRows message="no source events" />}</Tabs.Panel>
      <Tabs.Panel className="p-4 outline-none" value="settings"><div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">Registry state</span><select className="h-9 w-full border border-[var(--bp-border)] bg-black px-2 text-xs" onChange={(event) => setEnabled(event.target.value === "enabled")} value={(enabled ?? row.enabled) ? "enabled" : "disabled"}><option value="enabled">enabled</option><option value="disabled">disabled</option></select></label><label className="block"><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">Stale after (hours)</span><input className="h-9 w-full border border-[var(--bp-border)] bg-black px-2 text-xs" min={1} onChange={(event) => setStaleHours(event.target.value ? Number(event.target.value) : null)} placeholder="project default" type="number" value={staleHours === undefined ? row.stale_after_hours ?? "" : staleHours ?? ""} /></label></div><div className="mt-4 flex justify-end"><button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-green)] px-3 text-[10px] uppercase text-[var(--bp-green)] disabled:opacity-40" disabled={!dirty || mutation.isPending} onClick={() => mutation.mutate("save")} type="button"><Save className="size-3" />Save source</button></div></Tabs.Panel>
    </Tabs.Root></div>
    <ActionDialog description={`Remove ${row.source_identifier} from ${row.project_module}. Historical executions remain available.`} onOpenChange={setDeleteOpen} open={deleteOpen} title="Delete source"><div className="flex justify-end gap-2"><button className="h-8 border border-[var(--bp-border)] px-3 text-[10px] uppercase text-[var(--bp-muted)]" onClick={() => setDeleteOpen(false)} type="button">Back</button><button className="h-8 border border-[var(--bp-red)] px-3 text-[10px] uppercase text-[var(--bp-red)]" onClick={() => mutation.mutate("delete")} type="button">Delete source</button></div></ActionDialog>
  </div>;
}

function Readiness({ label, status }: { label: string; status: string }) {
  return <div className="p-3"><p className="mb-2 text-[10px] uppercase text-[var(--bp-subtle)]">{label}</p><StatusBadge status={status} /></div>;
}
