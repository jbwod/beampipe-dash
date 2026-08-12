"use client";

import { Tabs } from "@base-ui/react/tabs";
import { ExternalLink } from "lucide-react";
import { eagleUrlFromGraphUrl } from "@/shared/lib/eagle";
import type { MappingDraft, ProjectDraft } from "./project-draft";
import {
  commaList,
  FormGrid,
  GraphPatchEditor,
  MappingEditor,
  NumberField,
  QueryCollection,
  SectionBlock,
  StringMapEditor,
  TextField,
  ToggleField,
  TransformEditor,
  type DraftPatch,
} from "./project-fields";

const tabClass = "h-9 shrink-0 border-r border-[var(--bp-border-soft)] px-3 text-[10px] uppercase text-[var(--bp-muted)] hover:text-[var(--bp-text)] data-active:bg-[var(--bp-panel-soft)] data-active:text-[var(--bp-cyan)]";
const panelClass = "p-4 outline-none [[hidden]]:hidden";

export function ProjectVisualEditor({ draft, onPatch }: { draft: ProjectDraft; onPatch: DraftPatch }) {
  const discoveryAutomation = draft.automation.discovery;
  const executionAutomation = draft.automation.execution;
  const preparation = draft.discovery.prepare_metadata;
  const transforms = draft.definitions?.transforms ?? {};
  const graphUrl = draft.graph?.url ?? "";
  const eagleUrl = graphUrl ? eagleUrlFromGraphUrl(graphUrl, process.env.NEXT_PUBLIC_EAGLE_URL) : null;

  return (
    <Tabs.Root defaultValue="identity">
      <Tabs.List className="flex overflow-x-auto border-b border-[var(--bp-border)] bg-black">
        <Tabs.Tab className={tabClass} value="identity">Identity + TAP</Tabs.Tab>
        <Tabs.Tab className={tabClass} value="discovery">Discovery</Tabs.Tab>
        <Tabs.Tab className={tabClass} value="metadata">Metadata</Tabs.Tab>
        <Tabs.Tab className={tabClass} value="graph">Graph + manifest</Tabs.Tab>
        <Tabs.Tab className={tabClass} value="automation">Automation</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel className={panelClass} value="identity">
        <SectionBlock title="Project identity"><FormGrid><TextField label="Project ID" onChange={(value) => onPatch(["metadata", "id"], projectId(value))} value={draft.metadata.id} /><TextField label="Description" onChange={(value) => onPatch(["metadata", "description"], value)} value={draft.metadata.description} /></FormGrid><div className="mt-3 grid gap-3 md:grid-cols-2"><TextField label="API version" onChange={(value) => onPatch(["apiVersion"], value)} value={draft.apiVersion} /><TextField label="Kind" onChange={(value) => onPatch(["kind"], value)} value={draft.kind} /></div></SectionBlock>
        <SectionBlock detail="Adapter identifiers referenced by project-defined query templates" title="Adapters + TAP"><FormGrid><TextField label="Required adapters" onChange={(value) => onPatch(["adapters", "required"], commaList(value))} value={draft.adapters.required.join(", ")} /><ToggleField checked={draft.adapters.tap.fail_open} label="Fail open when TAP health is degraded" onChange={(value) => onPatch(["adapters", "tap", "fail_open"], value)} /><TextField label="CASDA TAP URL override" onChange={(value) => onPatch(["adapters", "casda_tap_url"], value || null)} type="url" value={draft.adapters.casda_tap_url} /><TextField label="Vizier TAP URL override" onChange={(value) => onPatch(["adapters", "vizier_tap_url"], value || null)} type="url" value={draft.adapters.vizier_tap_url} /><NumberField label="Timeout (seconds)" min={1} onChange={(value) => onPatch(["adapters", "tap", "timeout_seconds"], value ?? 90)} value={draft.adapters.tap.timeout_seconds} /><NumberField label="Retries" min={0} onChange={(value) => onPatch(["adapters", "tap", "retries"], value ?? 0)} value={draft.adapters.tap.retries} /></FormGrid></SectionBlock>
        <SectionBlock title="Source identity"><FormGrid><TextField label="Canonical field" onChange={(value) => onPatch(["source_identity", "canonical"], value)} value={draft.source_identity?.canonical} /></FormGrid></SectionBlock>
        <MappingEditor detail="Variables available to TAP templates" mappings={(draft.source_identity?.template_vars ?? {}) as Record<string, MappingDraft>} onPatch={onPatch} path={["source_identity", "template_vars"]} title="Template variables" transforms={Object.keys(transforms)} />
        <TransformEditor onPatch={onPatch} transforms={transforms} />
      </Tabs.Panel>

      <Tabs.Panel className={panelClass} value="discovery">
        <QueryCollection label="Queries" onPatch={onPatch} path={["discovery", "queries"]} queries={draft.discovery.queries} />
        <QueryCollection label="Enrichments" onPatch={onPatch} path={["discovery", "enrichments"]} queries={draft.discovery.enrichments} />
      </Tabs.Panel>

      <Tabs.Panel className={panelClass} value="metadata">
        <MappingEditor detail="Prepared records require sbid and dataset_id or visibility_filename" mappings={preparation?.field_map ?? {}} onPatch={onPatch} path={["discovery", "prepare_metadata", "field_map"]} title="Metadata field map" transforms={Object.keys(transforms)} />
        <MappingEditor detail="Source readiness flags derived during discovery" mappings={preparation?.discovery_flags ?? {}} onPatch={onPatch} path={["discovery", "prepare_metadata", "discovery_flags"]} title="Discovery flags" transforms={Object.keys(transforms)} />
        <SectionBlock title="Discovery signature"><FormGrid><TextField label="Excluded fields" onChange={(value) => onPatch(["discovery", "prepare_metadata", "signature", "exclude_fields"], commaList(value))} value={preparation?.signature?.exclude_fields.join(", ")} /><ToggleField checked={preparation?.signature?.include_discovery_flags} label="Include discovery flags" onChange={(value) => onPatch(["discovery", "prepare_metadata", "signature", "include_discovery_flags"], value)} /></FormGrid></SectionBlock>
      </Tabs.Panel>

      <Tabs.Panel className={panelClass} value="graph">
        <SectionBlock title="Logical graph"><FormGrid><TextField label="Graph URL" onChange={(value) => { onPatch(["graph", "url"], value || null); if (value) onPatch(["graph", "path"], null); }} type="url" value={graphUrl} /><TextField label="Local graph path" onChange={(value) => { onPatch(["graph", "path"], value || null); if (value) onPatch(["graph", "url"], null); }} value={draft.graph?.path} /></FormGrid>{eagleUrl ? <a className="mt-3 inline-flex h-8 items-center gap-2 border border-[var(--bp-cyan)] px-2 text-[10px] uppercase text-[var(--bp-cyan)] hover:bg-[var(--bp-cyan)]/10" href={eagleUrl} rel="noreferrer" target="_blank">Open graph in EAGLE <ExternalLink className="size-3" /></a> : null}</SectionBlock>
        <SectionBlock title="Manifest"><FormGrid columns={3}><TextField label="Path" onChange={(value) => onPatch(["manifest", "path"], value)} value={draft.manifest?.path} /><TextField label="Group by" onChange={(value) => onPatch(["manifest", "group_by"], commaList(value))} value={draft.manifest?.group_by.join(", ")} /><TextField label="Expand from" onChange={(value) => onPatch(["manifest", "expand_from"], value || null)} value={draft.manifest?.expand_from} /></FormGrid></SectionBlock>
        <StringMapEditor onPatch={onPatch} path={["manifest", "source_template"]} title="Source template" values={draft.manifest?.source_template ?? {}} />
        <StringMapEditor onPatch={onPatch} path={["manifest", "dataset_template"]} title="Dataset template" values={draft.manifest?.dataset_template ?? {}} />
        <GraphPatchEditor onPatch={onPatch} patches={draft.graph_patches} />
      </Tabs.Panel>

      <Tabs.Panel className={panelClass} value="automation">
        <SectionBlock detail="Stale source claims and durable discover_batch admission" title="Discovery scheduler"><div className="mb-3"><ToggleField checked={discoveryAutomation?.enabled} label="Enable automatic discovery" onChange={(value) => onPatch(["automation", "discovery", "enabled"], value)} /></div><FormGrid columns={3}><NumberField label="Stale after (hours)" min={1} onChange={(value) => onPatch(["automation", "discovery", "stale_after_hours"], value)} value={discoveryAutomation?.stale_after_hours} /><NumberField label="Claim TTL (minutes)" min={1} onChange={(value) => onPatch(["automation", "discovery", "claim_ttl_minutes"], value)} value={discoveryAutomation?.claim_ttl_minutes} /><NumberField label="Batch size" min={1} onChange={(value) => onPatch(["automation", "discovery", "batch_size"], value)} value={discoveryAutomation?.batch_size} /><NumberField label="Sources / tick" min={1} onChange={(value) => onPatch(["automation", "discovery", "tick_discovery_source_limit"], value)} value={discoveryAutomation?.tick_discovery_source_limit} /><NumberField label="Batches / tick" min={1} onChange={(value) => onPatch(["automation", "discovery", "tick_discovery_batch_limit"], value)} value={discoveryAutomation?.tick_discovery_batch_limit} /><NumberField label="Concurrent batches" min={1} onChange={(value) => onPatch(["automation", "discovery", "concurrent_discovery_batch_limit"], value)} value={discoveryAutomation?.concurrent_discovery_batch_limit} /><NumberField label="Queue max depth" min={1} onChange={(value) => onPatch(["automation", "discovery", "queue_max_depth"], value)} value={discoveryAutomation?.queue_max_depth} /></FormGrid></SectionBlock>
        <SectionBlock detail="Workflow-pending source grouping and execution admission" title="Execution scheduler"><div className="mb-3"><ToggleField checked={executionAutomation?.enabled} label="Enable automatic execution" onChange={(value) => onPatch(["automation", "execution", "enabled"], value)} /></div><FormGrid columns={3}><TextField label="Archive name" onChange={(value) => onPatch(["automation", "execution", "archive_name"], value)} value={executionAutomation?.archive_name} /><TextField label="Deployment profile" onChange={(value) => onPatch(["automation", "execution", "deployment_profile_name"], value || null)} value={executionAutomation?.deployment_profile_name} /><NumberField label="Sources / run" min={1} onChange={(value) => onPatch(["automation", "execution", "max_sources_per_execution"], value)} value={executionAutomation?.max_sources_per_execution} /><NumberField label="Minimum to trigger" min={1} onChange={(value) => onPatch(["automation", "execution", "min_sources_to_trigger"], value)} value={executionAutomation?.min_sources_to_trigger} /><NumberField label="Maximum wait (minutes)" min={1} onChange={(value) => onPatch(["automation", "execution", "max_wait_minutes"], value)} value={executionAutomation?.max_wait_minutes} /><NumberField label="Claim TTL (minutes)" min={1} onChange={(value) => onPatch(["automation", "execution", "claim_ttl_minutes"], value)} value={executionAutomation?.claim_ttl_minutes} /><NumberField label="Sources / tick" min={1} onChange={(value) => onPatch(["automation", "execution", "tick_execution_source_limit"], value)} value={executionAutomation?.tick_execution_source_limit} /><NumberField label="Runs / tick" min={1} onChange={(value) => onPatch(["automation", "execution", "tick_execution_run_limit"], value)} value={executionAutomation?.tick_execution_run_limit} /><NumberField label="Concurrent runs" min={1} onChange={(value) => onPatch(["automation", "execution", "concurrent_execution_run_limit"], value)} value={executionAutomation?.concurrent_execution_run_limit} /></FormGrid></SectionBlock>
        <SectionBlock title="Backend polling"><FormGrid columns={2}><NumberField label="REST poll interval (seconds)" min={0.1} onChange={(value) => onPatch(["automation", "execution", "execution_rest_remote_poll_interval_seconds"], value)} step={0.1} value={executionAutomation?.execution_rest_remote_poll_interval_seconds} /><NumberField label="REST maximum rounds" min={1} onChange={(value) => onPatch(["automation", "execution", "execution_rest_remote_poll_max_rounds"], value)} value={executionAutomation?.execution_rest_remote_poll_max_rounds} /><NumberField label="Slurm poll interval (seconds)" min={0.1} onChange={(value) => onPatch(["automation", "execution", "execution_slurm_remote_poll_interval_seconds"], value)} step={0.1} value={executionAutomation?.execution_slurm_remote_poll_interval_seconds} /><NumberField label="Slurm maximum rounds" min={1} onChange={(value) => onPatch(["automation", "execution", "execution_slurm_remote_poll_max_rounds"], value)} value={executionAutomation?.execution_slurm_remote_poll_max_rounds} /></FormGrid></SectionBlock>
      </Tabs.Panel>
    </Tabs.Root>
  );
}

function projectId(value: string) { return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, ""); }
