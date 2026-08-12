"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, Radar, Rocket, X } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { ActionDialog } from "@/shared/components/action-dialog";
import { dashboardFetch } from "@/shared/lib/http";
import type { DiscoverTriggerResponse, ProjectListItem, SourceBulkCreateResponse, SourceRegistryRow } from "@/shared/types/beampipe";
import { useCurrentUser } from "@/features/monitoring/queries";

const inputClass = "h-9 w-full border border-[var(--bp-border-soft)] bg-black px-2.5 text-xs";
const tabClass = "h-9 border-r border-[var(--bp-border)] px-3 text-[10px] uppercase text-[var(--bp-muted)] data-active:bg-[var(--bp-panel-soft)] data-active:text-[var(--bp-cyan)]";

export function SourceActions({ projects, selected }: { projects: ProjectListItem[]; selected: SourceRegistryRow[] }) {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [project, setProject] = useState(projects[0]?.project_id ?? "");
  const [sourceText, setSourceText] = useState("");
  const [discoverScope, setDiscoverScope] = useState<"selected" | "project">("selected");
  const [result, setResult] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const effectiveProject = project || projects[0]?.project_id || "";
  const sourceIdentifiers = useMemo(() => uniqueLines(sourceText), [sourceText]);
  const selectedByProject = useMemo(() => selected.reduce<Record<string, string[]>>((grouped, source) => {
    (grouped[source.project_module] ??= []).push(source.source_identifier);
    return grouped;
  }, {}), [selected]);
  const selectedProjects = Object.keys(selectedByProject);
  const composeHref = selectedProjects.length === 1
    ? `/runs/new?project=${encodeURIComponent(selectedProjects[0])}&sources=${encodeURIComponent(selectedByProject[selectedProjects[0]].join(","))}`
    : null;

  const register = useMutation({
    mutationFn: () => dashboardFetch<SourceBulkCreateResponse>("/api/beampipe/sources/bulk", { method: "POST", body: JSON.stringify({ items: sourceIdentifiers.map((source_identifier) => ({ project_module: effectiveProject, source_identifier, enabled: true })) }) }),
    onSuccess: async (response) => {
      setResult(`${response.total} source${response.total === 1 ? "" : "s"} registered`);
      setRegisterOpen(false);
      setSourceText("");
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
  });

  const discover = useMutation({
    mutationFn: async () => {
      const targets = discoverScope === "selected" ? Object.entries(selectedByProject) : [[effectiveProject, null] as [string, null]];
      const responses: DiscoverTriggerResponse[] = [];
      for (const [projectModule, identifiers] of targets) {
        responses.push(await dashboardFetch<DiscoverTriggerResponse>("/api/beampipe/sources/discover", { method: "POST", body: JSON.stringify({ project_module: projectModule, ...(identifiers ? { source_identifiers: identifiers } : {}) }) }));
      }
      return responses;
    },
    onSuccess: async (responses) => {
      const count = responses.reduce((total, response) => total + response.marked_count, 0);
      setResult(`${count} source${count === 1 ? "" : "s"} marked for discovery`);
      setDiscoverOpen(false);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["sources"] }), queryClient.invalidateQueries({ queryKey: ["jobs"] })]);
    },
  });

  const scheduler = useMutation({
    mutationFn: () => dashboardFetch("/api/beampipe/jobs", { method: "POST", body: JSON.stringify({ kind: "execution_scheduler_tick", payload: { project_module: effectiveProject }, execution_id: null, idempotency_key: `execution_scheduler_tick:manual:${effectiveProject}` }) }),
    onSuccess: async () => {
      setResult(`execution admission requested for ${effectiveProject}`);
      setSchedulerOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const error = register.error ?? discover.error ?? scheduler.error;
  return <>
    <div className="flex flex-wrap items-center gap-2">
      <button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-green)]/60 px-2 text-[10px] uppercase text-[var(--bp-green)]" onClick={() => setRegisterOpen(true)} type="button"><Plus className="size-3" />Register</button>
      <button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-cyan)]/60 px-2 text-[10px] uppercase text-[var(--bp-cyan)] disabled:opacity-40" disabled={!selected.length} onClick={() => { setDiscoverScope("selected"); setDiscoverOpen(true); }} type="button"><Radar className="size-3" />Discover selected</button>
      {composeHref ? <Link className="inline-flex h-8 items-center gap-2 border border-[var(--bp-green)]/60 px-2 text-[10px] uppercase text-[var(--bp-green)]" href={composeHref as Route}><Play className="size-3" />Compose run</Link> : null}
      {currentUser.data?.is_superuser ? <button aria-label="Run workflow admission" className="grid size-8 place-items-center border border-[var(--bp-amber)]/60 text-[var(--bp-amber)]" onClick={() => setSchedulerOpen(true)} title="Run workflow admission" type="button"><Rocket className="size-3.5" /></button> : null}
    </div>
    {result ? <p className="mt-2 text-right text-[10px] uppercase text-[var(--bp-green)]">+ {result}</p> : null}
    {error ? <p className="mt-2 max-w-xl text-right text-[10px] leading-4 text-[var(--bp-red)]">! {error.message}</p> : null}

    <ActionDialog description="Register one source per line. Existing project/source pairs are updated idempotently." onOpenChange={setRegisterOpen} open={registerOpen} title="Register sources"><ProjectSelect onChange={setProject} projects={projects} value={effectiveProject} /><label className="mt-3 block"><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">Source identifiers</span><textarea className="min-h-40 w-full resize-y border border-[var(--bp-border)] bg-black p-2.5 text-xs leading-5" onChange={(event) => setSourceText(event.target.value)} placeholder={"J103729-261901\nJ104059-270456"} value={sourceText} /></label><p className="mt-2 text-[10px] text-[var(--bp-subtle)]">{sourceIdentifiers.length} unique source{sourceIdentifiers.length === 1 ? "" : "s"}</p><DialogFooter busy={register.isPending} confirm="Register sources" disabled={!effectiveProject || !sourceIdentifiers.length} onCancel={() => setRegisterOpen(false)} onConfirm={() => register.mutate()} /></ActionDialog>

    <ActionDialog description="Reset discovery freshness and enqueue the durable scheduler path." onOpenChange={setDiscoverOpen} open={discoverOpen} title="Run discovery"><Tabs.Root onValueChange={(value) => setDiscoverScope(value as "selected" | "project")} value={discoverScope}><Tabs.List className="mb-4 flex border border-[var(--bp-border)]"><Tabs.Tab className={tabClass} disabled={!selected.length} value="selected">Selected / {selected.length}</Tabs.Tab><Tabs.Tab className={tabClass} value="project">Entire project</Tabs.Tab></Tabs.List><Tabs.Panel value="selected"><div className="max-h-48 divide-y divide-[var(--bp-border-soft)] overflow-y-auto border border-[var(--bp-border)]">{Object.entries(selectedByProject).map(([module, identifiers]) => <div className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2 text-xs" key={module}><span>{module}</span><span className="text-[var(--bp-cyan)]">{identifiers.length}</span></div>)}</div></Tabs.Panel><Tabs.Panel value="project"><ProjectSelect onChange={setProject} projects={projects} value={effectiveProject} /></Tabs.Panel></Tabs.Root><DialogFooter busy={discover.isPending} confirm="Mark for discovery" disabled={discoverScope === "selected" ? !selected.length : !effectiveProject} onCancel={() => setDiscoverOpen(false)} onConfirm={() => discover.mutate()} /></ActionDialog>

    <ActionDialog description="Ask the execution scheduler to apply project thresholds, wait policy, queue depth, and in-flight caps now." onOpenChange={setSchedulerOpen} open={schedulerOpen} title="Run workflow admission"><ProjectSelect onChange={setProject} projects={projects} value={effectiveProject} /><p className="mt-3 border-l-2 border-[var(--bp-amber)] px-3 py-2 text-[10px] leading-5 text-[var(--bp-muted)]">Only sources already marked workflow-pending and ready for execution can be admitted.</p><DialogFooter busy={scheduler.isPending} confirm="Run admission" disabled={!effectiveProject} onCancel={() => setSchedulerOpen(false)} onConfirm={() => scheduler.mutate()} tone="caution" /></ActionDialog>
  </>;
}

function ProjectSelect({ onChange, projects, value }: { onChange: (value: string) => void; projects: ProjectListItem[]; value: string }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">Project</span><select className={inputClass} onChange={(event) => onChange(event.target.value)} value={value}><option value="">select project</option>{projects.map((item) => <option key={item.project_id} value={item.project_id}>{item.project_id} / v{item.version}</option>)}</select></label>;
}

function DialogFooter({ busy, confirm, disabled, onCancel, onConfirm, tone = "positive" }: { busy: boolean; confirm: string; disabled?: boolean; onCancel: () => void; onConfirm: () => void; tone?: "positive" | "caution" }) {
  return <div className="mt-4 flex justify-end gap-2"><button aria-label="Close" className="grid size-8 place-items-center border border-[var(--bp-border)] text-[var(--bp-muted)]" onClick={onCancel} title="Close" type="button"><X className="size-3.5" /></button><button className={tone === "caution" ? "h-8 border border-[var(--bp-amber)] px-3 text-[10px] uppercase text-[var(--bp-amber)] disabled:opacity-40" : "h-8 border border-[var(--bp-green)] px-3 text-[10px] uppercase text-[var(--bp-green)] disabled:opacity-40"} disabled={busy || disabled} onClick={onConfirm} type="button">{busy ? "Working" : confirm}</button></div>;
}

function uniqueLines(value: string) {
  return [...new Set(value.split(/[\r\n,]+/).map((line) => line.trim()).filter(Boolean))];
}
