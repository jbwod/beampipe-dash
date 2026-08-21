"use client";

import { Checkbox } from "@base-ui/react/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Database, Play, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { EmptyRows, LoadingRows, QueryFailure, SectionHeading } from "@/shared/components/operator-ui";
import { PaginationControls } from "@/shared/components/pagination-controls";
import { StatusBadge } from "@/shared/components/status-badge";
import { dashboardFetch } from "@/shared/lib/http";
import { shortId } from "@/shared/lib/time";
import type { Execution, ExecutionCreatePayload, ExecutionPrepareResponse, SourceRegistryRow } from "@/shared/types/beampipe";
import { useProjects, useSources } from "@/features/monitoring/queries";
import { sourceState } from "@/features/monitoring/sources-view";
import { useDeploymentProfiles } from "@/features/profiles/queries";
import { createOrResumeExecution } from "./run-workflow";

const inputClass = "h-9 w-full min-w-0 border border-[var(--bp-border-soft)] bg-black px-2.5 text-xs";

export function RunComposer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projects = useProjects();
  const profiles = useDeploymentProfiles();
  const initialProject = searchParams.get("project") ?? "";
  const initialSources = useMemo(() => new Set((searchParams.get("sources") ?? "").split(",").filter(Boolean)), [searchParams]);
  const [project, setProject] = useState(initialProject);
  const effectiveProject = project || projects.data?.[0]?.project_id || "";
  const sources = useSources(effectiveProject || undefined);
  const [selected, setSelected] = useState<Set<string>>(initialSources);
  const [profileId, setProfileId] = useState("");
  const [archiveName, setArchiveName] = useState("casda");
  const [search, setSearch] = useState("");
  const [startImmediately, setStartImmediately] = useState(true);
  const [doStage, setDoStage] = useState(true);
  const [doSubmit, setDoSubmit] = useState(true);
  const [validatedFingerprint, setValidatedFingerprint] = useState<string | null>(null);
  const [createdRun, setCreatedRun] = useState<Execution | null>(null);
  const createdRunRef = useRef<Execution | null>(null);

  const scopedProfiles = (profiles.data ?? []).filter((profile) => !profile.project_module || profile.project_module === effectiveProject);
  const preferredProfile = scopedProfiles.find((profile) => profile.project_module === effectiveProject && profile.is_default)
    ?? scopedProfiles.find((profile) => profile.is_default)
    ?? scopedProfiles[0];
  const effectiveProfileId = profileId || preferredProfile?.uuid || "";
  const effectiveProfile = scopedProfiles.find((profile) => profile.uuid === effectiveProfileId);
  const rows = useMemo(() => (sources.data ?? []).filter((source) => !search || source.source_identifier.toLowerCase().includes(search.toLowerCase())), [search, sources.data]);
  const selectedRows = (sources.data ?? []).filter((source) => selected.has(source.source_identifier));
  const payload: ExecutionCreatePayload = {
    project_module: effectiveProject,
    sources: selectedRows.map((source) => ({ source_identifier: source.source_identifier })),
    archive_name: archiveName,
    deployment_profile_id: effectiveProfileId || null,
    deployment_profile_name: null,
  };
  const fingerprint = JSON.stringify(payload);

  const prepare = useMutation({
    mutationFn: () => dashboardFetch<ExecutionPrepareResponse>("/api/beampipe/executions/prepare", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => setValidatedFingerprint(fingerprint),
  });

  const create = useMutation({
    mutationFn: async () => {
      return createOrResumeExecution({
        existing: createdRunRef.current,
        create: () => dashboardFetch<Execution>("/api/beampipe/executions", { method: "POST", body: JSON.stringify(payload) }),
        start: startImmediately
          ? (run) => dashboardFetch(`/api/beampipe/executions/${run.uuid}/execute`, { method: "POST", body: JSON.stringify({ do_stage: doStage, do_submit: doSubmit }) })
          : undefined,
        onCreated: (run) => {
          createdRunRef.current = run;
          setCreatedRun(run);
        },
      });
    },
    onSuccess: async (run) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["executions"] }), queryClient.invalidateQueries({ queryKey: ["jobs"] })]);
      router.push(`/runs/${run.uuid}`);
    },
  });

  const invalidatePreview = () => {
    setValidatedFingerprint(null);
    prepare.reset();
  };
  const changeProject = (value: string) => {
    setProject(value);
    setSelected(new Set());
    setProfileId("");
    invalidatePreview();
  };
  const toggleSource = (identifier: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(identifier); else next.delete(identifier);
      return next;
    });
    invalidatePreview();
  };
  const selectVisible = (checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const source of rows) if (checked) next.add(source.source_identifier); else next.delete(source.source_identifier);
      return next;
    });
    invalidatePreview();
  };
  const previewCurrent = validatedFingerprint === fingerprint ? prepare.data : undefined;
  const canCreate = createdRun
    ? startImmediately && !create.isPending
    : Boolean(previewCurrent?.valid && selectedRows.length && effectiveProfileId && !create.isPending);

  return <div className="p-4 sm:p-6">
    <div className="mb-4 grid grid-cols-4 border border-[var(--bp-border)] text-[10px] uppercase"><Step active label="Define" number="01" /><Step active={selectedRows.length > 0} label="Select" number="02" /><Step active={Boolean(previewCurrent?.valid)} label="Validate" number="03" /><Step active={Boolean(createdRun)} label="Queue" number="04" /></div>

    <div className="grid min-w-0 border border-[var(--bp-border)] xl:grid-cols-[minmax(520px,1fr)_420px]">
      <main className="min-w-0 border-b border-[var(--bp-border)] xl:border-r xl:border-b-0">
        <SectionHeading detail="project, archive, and immutable deployment profile snapshot" title="Execution definition" />
        <div className="grid gap-3 p-4 md:grid-cols-3"><label><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">Project</span><select className={inputClass} onChange={(event) => changeProject(event.target.value)} value={effectiveProject}><option value="">select project</option>{projects.data?.map((item) => <option key={item.project_id} value={item.project_id}>{item.project_id} / v{item.version}</option>)}</select></label><label><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">Deployment profile</span><select className={inputClass} onChange={(event) => { setProfileId(event.target.value); invalidatePreview(); }} value={effectiveProfileId}><option value="">select profile</option>{scopedProfiles.map((profile) => <option key={profile.uuid} value={profile.uuid}>{profile.name} / r{profile.revision} / {profile.deployment.kind}</option>)}</select></label><label><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">Archive</span><input className={inputClass} onChange={(event) => { setArchiveName(event.target.value); invalidatePreview(); }} value={archiveName} /></label></div>

        <div className="border-t border-[var(--bp-border)]"><SectionHeading action={<span className="text-[10px] text-[var(--bp-cyan)]">{selectedRows.length} selected / {sources.data?.length ?? 0} loaded{sources.hasNextPage ? "+" : ""}</span>} detail="multiple sources are grouped into one execution" title="Sources" /><div className="p-3"><label className="relative block"><Search className="absolute top-2.5 left-3 size-3.5 text-[var(--bp-subtle)]" /><span className="sr-only">Search sources</span><input className={`${inputClass} pl-9`} onChange={(event) => setSearch(event.target.value)} placeholder="filter loaded sources..." value={search} /></label></div>{sources.isPending ? <LoadingRows rows={6} /> : sources.isError ? <QueryFailure message="Registered sources could not be loaded" retry={() => sources.refetch()} /> : <><div className="max-h-[440px] overflow-y-auto border-t border-[var(--bp-border-soft)]"><div className="grid grid-cols-[32px_minmax(0,1fr)] items-center border-b border-[var(--bp-border)] bg-black px-3 py-2 text-[10px] uppercase text-[var(--bp-subtle)] sm:grid-cols-[32px_minmax(0,1fr)_120px_120px]"><SourceCheck checked={rows.length > 0 && rows.every((source) => selected.has(source.source_identifier))} label="Select visible sources" onChange={selectVisible} /><span>Source</span><span className="hidden sm:block">Discovery</span><span className="hidden sm:block">Workflow</span></div>{rows.map((source) => <SourceRow checked={selected.has(source.source_identifier)} key={source.uuid} onChange={(checked) => toggleSource(source.source_identifier, checked)} source={source} />)}{!rows.length ? <EmptyRows message="no sources match" /> : null}</div><PaginationControls hasNext={Boolean(sources.hasNextPage) && !sources.isFetchingNextPage} nextLabel={sources.isFetchingNextPage ? "Loading" : "Load more sources"} onNext={() => sources.fetchNextPage()} /></>}</div>
      </main>

      <aside className="min-w-0 bg-[var(--bp-panel)]">
        <SectionHeading detail="authoritative Beampipe readiness check" title="Prepare + submit" />
        <div className="border-b border-[var(--bp-border)] p-4"><SummaryLine label="Project" value={effectiveProject || "--"} /><SummaryLine label="Profile" value={effectiveProfile ? `${effectiveProfile.name} / r${effectiveProfile.revision}` : "--"} /><SummaryLine label="Backend" value={effectiveProfile?.deployment.kind ?? "--"} /><SummaryLine label="Sources" value={String(selectedRows.length)} /><SummaryLine label="Archive" value={archiveName || "--"} /></div>
        <div className="border-b border-[var(--bp-border)] p-4"><button className="inline-flex h-9 w-full items-center justify-center gap-2 border border-[var(--bp-cyan)] text-[10px] uppercase text-[var(--bp-cyan)] disabled:cursor-not-allowed disabled:opacity-40" disabled={!selectedRows.length || !effectiveProject || !effectiveProfileId || prepare.isPending} onClick={() => prepare.mutate()} type="button"><Database className="size-3.5" />{prepare.isPending ? "Checking metadata" : "Validate selection"}</button>{prepare.isError ? <p className="mt-3 text-[10px] leading-5 text-[var(--bp-red)]">! {prepare.error.message}</p> : null}</div>

        {previewCurrent ? <Preview preview={previewCurrent} /> : <div className="grid min-h-40 place-items-center px-4 text-center text-[10px] leading-5 text-[var(--bp-subtle)]">[ validate the exact selection before creating its ledger record ]</div>}

        <div className="border-t border-[var(--bp-border)] p-4"><Toggle checked={startImmediately} label="Start immediately after creation" onChange={setStartImmediately} />{startImmediately ? <div className="mt-3 grid grid-cols-2 gap-3 border-l-2 border-[var(--bp-border)] pl-3"><Toggle checked={doStage} label="Stage inputs" onChange={setDoStage} /><Toggle checked={doSubmit} label="Submit backend" onChange={setDoSubmit} /></div> : null}<button className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 border border-[var(--bp-green)] text-[10px] uppercase text-[var(--bp-green)] disabled:cursor-not-allowed disabled:opacity-40" disabled={!canCreate} onClick={() => create.mutate()} type="button">{create.isPending ? createdRun ? "Retrying start" : "Creating execution" : createdRun ? <><Play className="size-3.5" />Retry existing run</> : startImmediately ? <><Play className="size-3.5" />Create + start</> : <><ArrowRight className="size-3.5" />Create pending run</>}</button>{create.isError ? <p className="mt-3 text-[10px] leading-5 text-[var(--bp-red)]">! {create.error.message}{createdRun ? ` The execution ${shortId(createdRun.uuid)} was created; retry will reuse it.` : ""}</p> : null}</div>
      </aside>
    </div>
  </div>;
}

function SourceRow({ checked, onChange, source }: { checked: boolean; onChange: (checked: boolean) => void; source: SourceRegistryRow }) {
  return <label className="grid min-h-16 cursor-pointer grid-cols-[32px_minmax(0,1fr)] items-center border-b border-[var(--bp-border-soft)] px-3 hover:bg-[var(--bp-panel-soft)] sm:min-h-12 sm:grid-cols-[32px_minmax(0,1fr)_120px_120px]"><SourceCheck checked={checked} label={`Select ${source.source_identifier}`} onChange={onChange} /><span className="min-w-0"><span className="block truncate text-xs text-[var(--bp-highlight)]">{source.source_identifier}</span><span className="block truncate text-[10px] text-[var(--bp-subtle)]">{shortId(source.discovery_signature, 12)}</span></span><span className="col-start-2 flex min-w-0 gap-2 pb-2 sm:contents sm:p-0"><StatusBadge status={source.discovery_signature ? source.discovery_claim_token ? "discovering" : "complete" : "incomplete"} /><StatusBadge status={source.workflow_run_pending ? "pending" : sourceState(source)} /></span></label>;
}

function SourceCheck({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <Checkbox.Root aria-label={label} checked={checked} className="grid size-4 place-items-center border border-[var(--bp-border)] bg-black text-black data-checked:border-[var(--bp-green)] data-checked:bg-[var(--bp-green)]" onCheckedChange={(value) => onChange(value === true)}><Checkbox.Indicator><Check className="size-3" /></Checkbox.Indicator></Checkbox.Root>;
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-8 items-center gap-2 text-xs"><SourceCheck checked={checked} label={label} onChange={onChange} /><span>{label}</span></label>;
}

function Preview({ preview }: { preview: ExecutionPrepareResponse }) {
  return <div className="border-b border-[var(--bp-border)]"><div className="grid grid-cols-3 divide-x divide-[var(--bp-border-soft)] border-b border-[var(--bp-border-soft)]"><PreviewMetric label="Status" value={preview.valid ? "valid" : "blocked"} /><PreviewMetric label="Datasets" value={String(preview.total_datasets)} /><PreviewMetric label="Sources" value={String(preview.sources_preview.length)} /></div>{preview.errors.length ? <div className="divide-y divide-[var(--bp-border-soft)]">{preview.errors.map((error) => <p className="px-4 py-2 text-[10px] leading-5 text-[var(--bp-red)]" key={error}>! {error}</p>)}</div> : <div className="divide-y divide-[var(--bp-border-soft)]">{preview.sources_preview.map((source) => <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-2 text-[10px]" key={source.source_identifier}><span className="truncate text-[var(--bp-highlight)]">{source.source_identifier}</span><span className="text-[var(--bp-muted)]">{source.sbid_count} SBID / {source.dataset_count} dataset</span></div>)}</div>}</div>;
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return <div className="p-3"><p className="mb-1 text-[9px] uppercase text-[var(--bp-subtle)]">{label}</p><p className="text-sm text-[var(--bp-highlight)]">{value}</p></div>;
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="flex min-w-0 items-center gap-3 border-b border-[var(--bp-border-soft)] py-2 last:border-b-0"><span className="text-[10px] uppercase text-[var(--bp-subtle)]">{label}</span><span className="ml-auto min-w-0 truncate text-xs text-[var(--bp-highlight)]">{value}</span></div>;
}

function Step({ active, label, number }: { active: boolean; label: string; number: string }) {
  return <div className={`min-w-0 border-r border-[var(--bp-border)] px-2 py-2 last:border-r-0 sm:px-3 ${active ? "text-[var(--bp-cyan)]" : "text-[var(--bp-subtle)]"}`}><span>{active ? "+" : "."} {number}</span><span className="ml-2 hidden sm:inline">{label}</span></div>;
}
