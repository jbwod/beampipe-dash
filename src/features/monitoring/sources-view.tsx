"use client";

import { Checkbox } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { DataTable, TableFrame, TableHead, Td, Th } from "@/shared/components/data-table";
import { PaginationControls } from "@/shared/components/pagination-controls";
import { EmptyRows, LiveIndicator, MetricCell, QueryFailure } from "@/shared/components/operator-ui";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatAge, shortId } from "@/shared/lib/time";
import type { SourceRegistryRow } from "@/shared/types/beampipe";
import { useProjects, useSources } from "./queries";
import { SourceActions } from "@/features/sources/source-actions";

export function SourcesView() {
  const [project, setProject] = useState("");
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const projects = useProjects();
  const sources = useSources(project || undefined);
  const rows = useMemo(() => (sources.data ?? []).filter((source) => {
    if (search && !source.source_identifier.toLowerCase().includes(search.toLowerCase())) return false;
    return !state || sourceState(source) === state;
  }), [search, sources.data, state]);
  const selected = (sources.data ?? []).filter((source) => selectedIds.has(source.uuid));
  const visibleSelected = rows.length > 0 && rows.every((source) => selectedIds.has(source.uuid));

  const toggle = (id: string, checked: boolean) => setSelectedIds((current) => {
    const next = new Set(current);
    if (checked) next.add(id); else next.delete(id);
    return next;
  });

  const toggleVisible = (checked: boolean) => setSelectedIds((current) => {
    const next = new Set(current);
    for (const source of rows) if (checked) next.add(source.uuid); else next.delete(source.uuid);
    return next;
  });

  return (
    <div className="p-4 sm:p-6">
      <section className="mb-4 grid grid-cols-2 border-t border-l border-[var(--bp-border)] md:grid-cols-4">
        <MetricCell label="visible sources" value={rows.length} />
        <MetricCell label="workflow pending" value={rows.filter((source) => source.workflow_run_pending).length} tone={rows.some((source) => source.workflow_run_pending) ? "caution" : "neutral"} />
        <MetricCell label="active claims" value={rows.filter((source) => source.discovery_claim_token || source.workflow_claim_token).length} />
        <MetricCell label="disabled" value={rows.filter((source) => !source.enabled).length} />
      </section>

      <div className="mb-4 grid gap-2 border border-[var(--bp-border)] bg-[var(--bp-panel)] p-2 sm:grid-cols-[minmax(180px,1fr)_180px_180px_auto]">
        <label><span className="sr-only">Search sources</span><input className="h-9 w-full border border-[var(--bp-border-soft)] bg-black px-3 text-xs" onChange={(event) => setSearch(event.target.value)} placeholder="filter source identifier..." value={search} /></label>
        <label><span className="sr-only">Project</span><select className="h-9 w-full border border-[var(--bp-border-soft)] bg-black px-2 text-xs" onChange={(event) => setProject(event.target.value)} value={project}><option value="">all projects</option>{projects.data?.map((item) => <option key={item.project_id} value={item.project_id}>{item.project_id}</option>)}</select></label>
        <label><span className="sr-only">State</span><select className="h-9 w-full border border-[var(--bp-border-soft)] bg-black px-2 text-xs" onChange={(event) => setState(event.target.value)} value={state}><option value="">all states</option>{["registered", "discovered", "pending", "discovering", "admitting", "disabled"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <LiveIndicator fetching={sources.isFetching} label="live / 10s" />
      </div>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><p className="pt-2 text-[10px] uppercase text-[var(--bp-subtle)]">{selected.length} selected / {rows.length} visible / {sources.data?.length ?? 0} loaded{sources.hasNextPage ? "+" : ""}</p><SourceActions projects={projects.data ?? []} selected={selected} /></div>

      {sources.isError ? <QueryFailure message="Source registry is unavailable" retry={() => sources.refetch()} /> : (
        <div className="border border-[var(--bp-border)]"><TableFrame className="border-0"><DataTable className="min-w-[1180px]"><TableHead><tr><Th className="w-10"><SourceCheckbox checked={visibleSelected} label="Select visible sources" onChange={toggleVisible} /></Th><Th>Source / project</Th><Th className="w-[128px]">State</Th><Th className="w-[160px]">Last checked</Th><Th className="w-[160px]">Last attempted</Th><Th className="w-[140px]">Discovery sig</Th><Th className="w-[140px]">Executed sig</Th><Th className="w-[120px]">Stale after</Th></tr></TableHead><tbody>
          {rows.map((source) => <tr className="hover:bg-[var(--bp-panel-soft)]" key={source.uuid}><Td><SourceCheckbox checked={selectedIds.has(source.uuid)} label={`Select ${source.source_identifier}`} onChange={(checked) => toggle(source.uuid, checked)} /></Td><Td><Link className="block truncate text-[var(--bp-cyan)] hover:underline" href={`/sources/${source.uuid}` as Route}>{source.source_identifier}</Link><p className="truncate text-[10px] text-[var(--bp-subtle)]">{source.project_module}</p></Td><Td><StatusBadge status={sourceState(source)} /></Td><Td><p>{formatAge(source.last_checked_at)}</p>{source.discovery_claim_expires_at ? <p className="text-[10px] text-[var(--bp-cyan)]">claim expires {formatAge(source.discovery_claim_expires_at)}</p> : null}</Td><Td className="text-[var(--bp-muted)]">{formatAge(source.last_attempted_at)}</Td><Td className="text-[10px] text-[var(--bp-muted)]">{shortId(source.discovery_signature, 12)}</Td><Td className="text-[10px] text-[var(--bp-muted)]">{shortId(source.last_executed_discovery_signature, 12)}</Td><Td className="tabular-nums text-[var(--bp-muted)]">{source.stale_after_hours == null ? "project default" : `${source.stale_after_hours}h`}</Td></tr>)}
          {!rows.length ? <tr><td colSpan={8}><EmptyRows message="no sources match these filters" /></td></tr> : null}
        </tbody></DataTable></TableFrame><PaginationControls hasNext={Boolean(sources.hasNextPage) && !sources.isFetchingNextPage} nextLabel={sources.isFetchingNextPage ? "Loading" : "Load more"} onNext={() => sources.fetchNextPage()} /></div>
      )}
    </div>
  );
}

function SourceCheckbox({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <Checkbox.Root aria-label={label} checked={checked} className="grid size-4 place-items-center border border-[var(--bp-border)] bg-black text-black data-checked:border-[var(--bp-green)] data-checked:bg-[var(--bp-green)]" onCheckedChange={(value) => onChange(value === true)}><Checkbox.Indicator><Check className="size-3" /></Checkbox.Indicator></Checkbox.Root>;
}

export function sourceState(source: SourceRegistryRow) {
  if (!source.enabled) return "disabled";
  if (source.discovery_claim_token) return "discovering";
  if (source.workflow_claim_token) return "admitting";
  if (source.workflow_run_pending) return "pending";
  if (source.discovery_signature) return "discovered";
  return "registered";
}
