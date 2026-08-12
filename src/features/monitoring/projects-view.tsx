"use client";

import { Braces, FilePlus2 } from "lucide-react";
import Link from "next/link";
import { DataTable, TableFrame, TableHead, Td, Th } from "@/shared/components/data-table";
import { EmptyRows, LiveIndicator, MetricCell, QueryFailure, SectionHeading } from "@/shared/components/operator-ui";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatAge } from "@/shared/lib/time";
import { useExecutions, useProjectContracts, useProjects, useSources } from "./queries";

export function ProjectsView() {
  const projects = useProjects();
  const contracts = useProjectContracts();
  const sources = useSources();
  const executions = useExecutions("items_per_page=500");
  const reports = new Map((contracts.data ?? []).map((report) => [report.project_id, report]));
  const totalWarnings = contracts.data?.reduce((sum, report) => sum + (report.warnings?.length ?? 0), 0) ?? 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3"><p className="text-[10px] uppercase text-[var(--bp-subtle)]">Immutable revisions / one active version per project</p><LiveIndicator fetching={[projects, contracts, sources, executions].some((query) => query.isFetching)} label="live / 30s" /></div>
      <section className="mb-4 grid grid-cols-2 border-t border-l border-[var(--bp-border)] md:grid-cols-4">
        <MetricCell label="active projects" value={projects.data?.filter((project) => project.active).length ?? "--"} tone="positive" />
        <MetricCell label="registered sources" value={sources.data?.length ?? "--"} />
        <MetricCell label="recorded runs" value={executions.data?.total ?? "--"} />
        <MetricCell label="config warnings" value={totalWarnings} tone={totalWarnings ? "caution" : "positive"} />
      </section>

      <section className="border border-[var(--bp-border)]">
        <SectionHeading title="Project registry" detail="active runtime configuration" action={<Link className="inline-flex h-7 items-center gap-2 border border-[var(--bp-cyan)] px-2 text-[10px] uppercase text-[var(--bp-cyan)] hover:bg-[var(--bp-cyan)]/10" href="/projects/new"><FilePlus2 className="size-3" />New project</Link>} />
        {projects.isError ? <QueryFailure message="Project registry is unavailable" retry={() => projects.refetch()} /> : (
          <TableFrame className="border-0"><DataTable className="min-w-[860px]"><TableHead><tr><Th>Project</Th><Th className="w-[100px]">Version</Th><Th className="w-[130px]">Contract</Th><Th className="w-[118px]">Sources</Th><Th className="w-[118px]">Pending</Th><Th className="w-[118px]">Runs</Th><Th className="w-[130px]">Latest run</Th><Th className="w-[112px]"><span className="sr-only">Action</span></Th></tr></TableHead><tbody>
            {projects.data?.map((project) => {
              const projectSources = sources.data?.filter((source) => source.project_module === project.project_id) ?? [];
              const projectRuns = executions.data?.items.filter((run) => run.project_module === project.project_id) ?? [];
              const report = reports.get(project.project_id);
              return <tr className="hover:bg-[var(--bp-panel-soft)]" key={project.project_id}><Td><span className="inline-flex items-center gap-2"><Braces className="size-3.5 text-[var(--bp-cyan)]" /><span className="text-[var(--bp-highlight)]">{project.project_id}</span></span></Td><Td className="tabular-nums">v{project.version}</Td><Td><StatusBadge status={report?.valid === false ? "error" : report?.warnings?.length ? "warning" : "valid"} /></Td><Td className="tabular-nums">{projectSources.length}</Td><Td className="tabular-nums text-[var(--bp-amber)]">{projectSources.filter((source) => source.workflow_run_pending).length}</Td><Td className="tabular-nums">{projectRuns.length}{executions.data && executions.data.total > executions.data.items.length ? "+" : ""}</Td><Td className="text-[10px] text-[var(--bp-muted)]">{formatAge(projectRuns[0]?.created_at)}</Td><Td><Link className="text-[10px] uppercase text-[var(--bp-cyan)] hover:underline" href={`/projects/new?project=${encodeURIComponent(project.project_id)}`}>Open studio</Link></Td></tr>;
            })}
            {!projects.data?.length ? <tr><td colSpan={8}><EmptyRows message="no projects configured" /></td></tr> : null}
          </tbody></DataTable></TableFrame>
        )}
      </section>
    </div>
  );
}
