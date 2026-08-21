"use client";

import Link from "next/link";
import type { Route } from "next";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, TableFrame, TableHead, Td, Th } from "@/shared/components/data-table";
import { PaginationControls } from "@/shared/components/pagination-controls";
import { EmptyRows, LiveIndicator, QueryFailure } from "@/shared/components/operator-ui";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatAge, formatDateTime, shortId } from "@/shared/lib/time";
import { useExecutions, useProjects } from "./queries";

const statuses = ["", "pending", "running", "awaiting_scheduler", "retrying", "completed", "failed", "cancelled", "not_submitted"];
const PAGE_SIZE = 100;

export function RunsView() {
  const [project, setProject] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const projects = useProjects();
  const query = new URLSearchParams({ items_per_page: String(PAGE_SIZE), page: String(page) });
  if (project) query.set("project_module", project);
  if (status) query.set("status", status);
  const executions = useExecutions(query.toString());
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return executions.data?.items ?? [];
    return (executions.data?.items ?? []).filter((run) =>
      [run.uuid, run.project_module, run.scheduler_job_id, run.daliuge_session_id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [executions.data?.items, search]);
  const totalPages = Math.max(1, Math.ceil((executions.data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex justify-end"><Link className="inline-flex h-9 items-center gap-2 border border-[var(--bp-green)]/60 px-3 text-[10px] uppercase text-[var(--bp-green)] hover:bg-[var(--bp-green)]/10" href={"/runs/new" as Route}><Plus className="size-3" />Compose run</Link></div>
      <div className="mb-4 grid gap-2 border border-[var(--bp-border)] bg-[var(--bp-panel)] p-2 sm:grid-cols-[minmax(180px,1fr)_180px_180px_auto]">
        <label className="min-w-0"><span className="sr-only">Search runs on this page</span><input className="h-9 w-full border border-[var(--bp-border-soft)] bg-black px-3 text-xs placeholder:text-[var(--bp-subtle)]" onChange={(event) => setSearch(event.target.value)} placeholder="filter this page by run, session, scheduler id..." value={search} /></label>
        <label><span className="sr-only">Project</span><select className="h-9 w-full border border-[var(--bp-border-soft)] bg-black px-2 text-xs" onChange={(event) => { setProject(event.target.value); setPage(1); }} value={project}><option value="">all projects</option>{projects.data?.map((item) => <option key={item.project_id} value={item.project_id}>{item.project_id}</option>)}</select></label>
        <label><span className="sr-only">Status</span><select className="h-9 w-full border border-[var(--bp-border-soft)] bg-black px-2 text-xs" onChange={(event) => { setStatus(event.target.value); setPage(1); }} value={status}>{statuses.map((item) => <option key={item || "all"} value={item}>{item ? item.replaceAll("_", " ") : "all statuses"}</option>)}</select></label>
        <LiveIndicator fetching={executions.isFetching} />
      </div>

      <div className="mb-2 flex items-center justify-between text-[10px] uppercase text-[var(--bp-subtle)]"><span>{rows.length} visible / {executions.data?.total ?? 0} total</span><span>newest first</span></div>
      {executions.isError ? <QueryFailure message="Execution history is unavailable" retry={() => executions.refetch()} /> : (
        <div className="border border-[var(--bp-border)]"><TableFrame className="border-0">
          <DataTable>
            <TableHead><tr><Th className="w-[112px]">Run</Th><Th className="w-[190px]">Project</Th><Th className="w-[140px]">State</Th><Th>Phase / backend</Th><Th className="w-[180px]">Created</Th><Th className="w-[112px]">Reconciled</Th></tr></TableHead>
            <tbody>
              {rows.map((run) => (
                <tr className="group hover:bg-[var(--bp-panel-soft)]" key={run.uuid}>
                  <Td><Link className="text-[var(--bp-cyan)] group-hover:underline" href={`/runs/${run.uuid}` as Route}>{shortId(run.uuid)}</Link></Td>
                  <Td><p className="truncate text-[var(--bp-highlight)]">{run.project_module}</p><p className="truncate text-[10px] text-[var(--bp-subtle)]">{sourceCount(run.sources)} source{sourceCount(run.sources) === 1 ? "" : "s"}</p></Td>
                  <Td><StatusBadge status={run.status} /></Td>
                  <Td><p className="truncate">{run.execution_phase ?? run.control_phase ?? "--"}</p><p className="truncate text-[10px] text-[var(--bp-subtle)]">{run.scheduler_name ?? (run.daliuge_session_id ? "rest_remote" : "not assigned")}</p></Td>
                  <Td><p className="truncate">{formatDateTime(run.created_at)}</p><p className="text-[10px] text-[var(--bp-subtle)]">{formatAge(run.created_at)}</p></Td>
                  <Td><span className="text-[10px] text-[var(--bp-muted)]">{formatAge(run.last_reconciled_at)}</span></Td>
                </tr>
              ))}
              {!rows.length && !executions.isLoading ? <tr><td colSpan={6}><EmptyRows message="no runs match these filters" /></td></tr> : null}
            </tbody>
          </DataTable>
        </TableFrame><PaginationControls hasNext={page < totalPages} hasPrevious={page > 1} onNext={() => setPage((current) => Math.min(totalPages, current + 1))} onPrevious={() => setPage((current) => Math.max(1, current - 1))} page={page} totalPages={totalPages} /></div>
      )}
    </div>
  );
}

function sourceCount(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return 0;
}
