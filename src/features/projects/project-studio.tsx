"use client";

import { yaml } from "@codemirror/lang-yaml";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Braces, Check, Copy, FilePlus2, History, Save } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { parse, stringify } from "yaml";
import { EmptyRows, QueryFailure, SectionHeading } from "@/shared/components/operator-ui";
import { StatusBadge } from "@/shared/components/status-badge";
import { dashboardFetch } from "@/shared/lib/http";
import { useUnsavedNavigationGuard } from "@/shared/hooks/use-unsaved-navigation-guard";
import { formatDateTime, shortId } from "@/shared/lib/time";
import type { ProjectConfigRow, ValidationReport } from "@/shared/types/beampipe";
import { useCurrentUser, useProjects } from "@/features/monitoring/queries";
import { createProjectDraft, isProjectDraft, normalizeProjectDraft, type ProjectDraft, updateDraft, validateProjectDraft } from "./project-draft";
import { ProjectVisualEditor } from "./project-visual-editor";
import { useProjectConfig, useProjectContract, useProjectEvents, useProjectVersions } from "./queries";

const editorTheme = EditorView.theme({
  "&": { backgroundColor: "#050505", color: "#e6edf3", fontSize: "12px" },
  ".cm-content": { caretColor: "#7fd7e6", padding: "12px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#7fd7e6" },
  ".cm-gutters": { backgroundColor: "#090b0d", color: "#6e7681", borderRight: "1px solid #24292f" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#0d1117" },
  "&.cm-focused": { outline: "none" },
});
const extensions = [yaml(), EditorView.lineWrapping, editorTheme];

interface StudioDocument { draft: ProjectDraft; yaml: string }

export function ProjectStudio() {
  const searchParams = useSearchParams();
  const selectedProject = searchParams.get("project");
  const activeConfig = useProjectConfig(selectedProject);

  if (selectedProject && activeConfig.isPending) {
    return <div className="grid min-h-[640px] place-items-center text-xs text-[var(--bp-muted)]">[ loading active project config ]</div>;
  }

  return <ProjectStudioEditor activeConfig={activeConfig} key={activeConfig.data?.uuid ?? `new:${selectedProject ?? ""}`} selectedProject={selectedProject} />;
}

function ProjectStudioEditor({ activeConfig, selectedProject }: { activeConfig: ReturnType<typeof useProjectConfig>; selectedProject: string | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const projects = useProjects();
  const versions = useProjectVersions(selectedProject);
  const contract = useProjectContract(selectedProject);
  const events = useProjectEvents(selectedProject);
  const currentUser = useCurrentUser();
  const initial = useMemo(() => activeConfig.data && isProjectDraft(activeConfig.data.spec)
    ? normalizeProjectDraft(activeConfig.data.spec)
    : createProjectDraft(), [activeConfig.data]);
  const [document, setDocument] = useState<StudioDocument>({ draft: initial, yaml: serialize(initial) });
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [selectedVersionUuid, setSelectedVersionUuid] = useState(activeConfig.data?.uuid ?? "");

  const loadRow = useCallback((row: ProjectConfigRow, markDirty = false) => {
    if (!isProjectDraft(row.spec)) return;
    const draft = normalizeProjectDraft(row.spec);
    setDocument({ draft, yaml: serialize(draft) });
    setYamlError(null);
    setDirty(markDirty);
    setReport(null);
  }, []);

  const confirmNavigation = useUnsavedNavigationGuard(dirty, "Discard unsaved project changes?");

  const upload = useMutation({
    mutationFn: () => dashboardFetch<ValidationReport>("/api/beampipe/project-configs", { method: "POST", headers: { "Content-Type": "text/plain" }, body: document.yaml }),
    onSuccess: async (nextReport) => {
      setReport(nextReport);
      setDirty(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["project-contracts"] }),
        queryClient.invalidateQueries({ queryKey: ["project-config", document.draft.metadata.id] }),
        queryClient.invalidateQueries({ queryKey: ["project-versions", document.draft.metadata.id] }),
      ]);
      router.replace(`/projects/new?project=${encodeURIComponent(document.draft.metadata.id)}`);
    },
  });

  const patch = useCallback((path: Array<string | number>, value: unknown) => {
    setDocument((current) => {
      const draft = updateDraft(current.draft, path, value);
      return { draft, yaml: serialize(draft) };
    });
    setYamlError(null);
    setDirty(true);
    setReport(null);
  }, []);

  const updateYaml = (value: string) => {
    setDirty(true);
    setReport(null);
    try {
      const parsed: unknown = parse(value);
      if (!isProjectDraft(parsed)) throw new Error("Document must contain apiVersion, kind, and metadata");
      setDocument({ draft: normalizeProjectDraft(parsed), yaml: value });
      setYamlError(null);
    } catch (error) {
      setDocument((current) => ({ ...current, yaml: value }));
      setYamlError(error instanceof Error ? error.message : "Invalid YAML");
    }
  };

  const newProject = () => {
    if (!confirmNavigation()) return;
    const draft = createProjectDraft();
    setDocument({ draft, yaml: serialize(draft) });
    setYamlError(null);
    setDirty(false);
    setReport(null);
    router.replace("/projects/new");
  };

  const activeReport = report ?? contract.data;
  const draftErrors = useMemo(() => validateProjectDraft(document.draft), [document.draft]);
  const canSave = currentUser.data?.is_superuser && !yamlError && draftErrors.length === 0 && !upload.isPending;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 grid gap-2 border border-[var(--bp-border)] bg-[var(--bp-panel)] p-2 lg:grid-cols-[minmax(180px,1fr)_220px_auto_auto]">
        <label><span className="sr-only">Project</span><select className="h-9 w-full border border-[var(--bp-border-soft)] bg-black px-2 text-xs" onChange={(event) => { if (confirmNavigation()) router.replace(event.target.value ? `/projects/new?project=${encodeURIComponent(event.target.value)}` : "/projects/new"); }} value={selectedProject ?? ""}><option value="">new project draft</option>{projects.data?.map((project) => <option key={project.project_id} value={project.project_id}>{project.project_id} / v{project.version}</option>)}</select></label>
        <label><span className="sr-only">Version</span><select className="h-9 w-full border border-[var(--bp-border-soft)] bg-black px-2 text-xs disabled:opacity-40" disabled={!versions.data?.length} onChange={(event) => { const row = versions.data?.find((version) => version.uuid === event.target.value); if (row && confirmNavigation()) { setSelectedVersionUuid(row.uuid); loadRow(row, !row.active); } }} value={selectedVersionUuid}><option value="">version history</option>{versions.data?.map((version) => <option key={version.uuid} value={version.uuid}>v{version.version}{version.active ? " / active" : ""} / {formatDateTime(version.uploaded_at)}</option>)}</select></label>
        <button className="inline-flex h-9 items-center justify-center gap-2 border border-[var(--bp-border)] px-3 text-[10px] uppercase text-[var(--bp-muted)] hover:text-[var(--bp-cyan)]" onClick={newProject} type="button"><FilePlus2 className="size-3" />New</button>
        <button className="inline-flex h-9 items-center justify-center gap-2 border border-[var(--bp-green)]/60 px-3 text-[10px] uppercase text-[var(--bp-green)] disabled:cursor-not-allowed disabled:opacity-40" disabled={!canSave} onClick={() => upload.mutate()} title={currentUser.data?.is_superuser ? "Save immutable project version" : "Superuser access required"} type="button"><Save className="size-3" />{upload.isPending ? "Saving" : "Save version"}</button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] uppercase">
        <StatusBadge status={yamlError ? "error" : "valid"} />
        <span className="text-[var(--bp-subtle)]">YAML syntax</span>
        {activeReport ? <><span className="text-[var(--bp-border)]">/</span><StatusBadge status={activeReport.valid ? activeReport.warnings?.length ? "warning" : "valid" : "error"} /><span className="text-[var(--bp-subtle)]">Beampipe contract</span></> : null}
        {dirty ? <span className="ml-auto text-[var(--bp-amber)]">~ unsaved draft</span> : <span className="ml-auto text-[var(--bp-green)]">+ immutable revision</span>}
      </div>

      {activeConfig.isError ? <div className="mb-4"><QueryFailure message="Active project configuration could not be loaded" retry={() => activeConfig.refetch()} /></div> : null}
      {upload.isError ? <div className="mb-4 border-l-2 border-[var(--bp-red)] px-3 py-2 text-xs leading-5 text-[var(--bp-red)]">{upload.error.message}</div> : null}
      {draftErrors.length ? <div className="mb-4 border-l-2 border-[var(--bp-red)] px-3 py-2 text-[10px] leading-5 text-[var(--bp-red)]">{draftErrors.map((error) => <p key={error}>! {error}</p>)}</div> : null}
      {activeReport && ((activeReport.errors?.length ?? 0) > 0 || (activeReport.warnings?.length ?? 0) > 0) ? <DiagnosticStrip report={activeReport} /> : null}

      <div className="grid min-w-0 border border-[var(--bp-border)] xl:grid-cols-[minmax(560px,0.95fr)_minmax(560px,1.05fr)]">
        <section className="min-w-0 border-b border-[var(--bp-border)] xl:border-r xl:border-b-0">
          <div className="flex h-9 items-center border-b border-[var(--bp-border)] px-3 text-[10px] uppercase"><Braces className="mr-2 size-3 text-[var(--bp-cyan)]" /><span>Visual config</span><span className="ml-auto text-[var(--bp-subtle)]">{document.draft.metadata.id}</span></div>
          <div className="max-h-none overflow-y-auto xl:h-[calc(100dvh-300px)] xl:min-h-[620px]"><ProjectVisualEditor draft={document.draft} onPatch={patch} /></div>
        </section>

        <section className="min-w-0 bg-black">
          <div className="flex h-9 items-center border-b border-[var(--bp-border)] px-3 text-[10px] uppercase"><span className={yamlError ? "text-[var(--bp-red)]" : "text-[var(--bp-green)]"}>{yamlError ? "!" : "+"}</span><span className="ml-2">Project YAML</span><span className="ml-auto mr-2 truncate text-[var(--bp-subtle)]">{document.yaml.split(/\r?\n/).length} lines</span><button aria-label="Format YAML" className="grid size-6 place-items-center text-[var(--bp-muted)] hover:text-[var(--bp-cyan)]" disabled={Boolean(yamlError)} onClick={() => setDocument((current) => ({ ...current, yaml: serialize(current.draft) }))} title="Format YAML" type="button"><Braces className="size-3" /></button><button aria-label="Copy YAML" className="grid size-6 place-items-center text-[var(--bp-muted)] hover:text-[var(--bp-cyan)]" onClick={async () => { await navigator.clipboard.writeText(document.yaml); setCopied(true); window.setTimeout(() => setCopied(false), 1_200); }} title="Copy YAML" type="button">{copied ? <Check className="size-3 text-[var(--bp-green)]" /> : <Copy className="size-3" />}</button></div>
          <CodeMirror aria-label="Project YAML" basicSetup={{ bracketMatching: true, foldGutter: true, highlightActiveLine: true, lineNumbers: true }} extensions={extensions} height="max(620px, calc(100dvh - 300px))" onChange={updateYaml} theme="dark" value={document.yaml} />
          {yamlError ? <p className="border-t border-[var(--bp-red)]/40 px-3 py-2 text-[10px] leading-4 text-[var(--bp-red)]">{yamlError}</p> : null}
        </section>
      </div>

      <div className="mt-4 grid gap-2 text-[10px] text-[var(--bp-subtle)] sm:grid-cols-3"><span className="inline-flex items-center gap-2"><History className="size-3 text-[var(--bp-cyan)]" />Active {activeConfig.data ? `v${activeConfig.data.version}` : "new"}</span><span>spec / {shortId(report?.spec_sha256 ?? activeConfig.data?.spec_sha256, 16)}</span><span className="text-right">{document.yaml.split(/\r?\n/).length} YAML lines</span></div>

      {selectedProject ? <section className="mt-4 border border-[var(--bp-border)]"><SectionHeading detail="latest 50 immutable control-plane events" title="Project provenance" />{events.isError ? <QueryFailure message="Project provenance could not be loaded" retry={() => events.refetch()} /> : events.data?.length ? <div className="divide-y divide-[var(--bp-border-soft)]">{events.data.map((event) => <div className="grid min-w-0 gap-1 px-3 py-2.5 text-[10px] sm:grid-cols-[180px_minmax(0,1fr)_180px]" key={event.id}><span className="text-[var(--bp-cyan)]">{event.event_type}</span><span className="truncate text-[var(--bp-muted)]" title={JSON.stringify(event.payload)}>{event.actor ?? "system"}{event.source_identifier ? ` / ${event.source_identifier}` : ""} / {JSON.stringify(event.payload)}</span><span className="text-[var(--bp-subtle)] sm:text-right">{formatDateTime(event.occurred_at)}</span></div>)}</div> : <EmptyRows message="no project provenance recorded" />}</section> : null}
    </div>
  );
}

function DiagnosticStrip({ report }: { report: ValidationReport }) {
  const items = [...(report.errors ?? []), ...(report.warnings ?? [])];
  return <div className="mb-4 divide-y divide-[var(--bp-border-soft)] border border-[var(--bp-border)]">{items.map((item, index) => <div className="grid gap-2 px-3 py-2 text-[10px] sm:grid-cols-[100px_180px_minmax(0,1fr)]" key={`${item.code}-${index}`}><StatusBadge status={item.severity} /><span className="truncate text-[var(--bp-muted)]">{item.path}</span><span className="text-[var(--bp-highlight)]">{item.message}{item.hint ? ` / ${item.hint}` : ""}</span></div>)}</div>;
}

function serialize(draft: ProjectDraft) {
  return stringify(draft, { lineWidth: 0 });
}
