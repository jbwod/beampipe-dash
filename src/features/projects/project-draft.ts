export interface DiscoveryQueryDraft {
  name: string;
  adapter: string;
  template: string;
  source_id_transform?: string | null;
}

export interface MappingDraft {
  from: string;
  transform?: string | string[] | null;
}

export interface TransformDraft {
  kind: string;
  prefix?: string | null;
  suffix?: string | null;
  from?: string | null;
  to?: string | null;
  default?: string | null;
  pattern?: string | null;
  group?: number | null;
  separators?: string[] | null;
  steps?: string[] | null;
}

export interface ProjectDraft {
  apiVersion: string;
  kind: string;
  metadata: { id: string; description?: string | null };
  definitions?: { transforms?: Record<string, TransformDraft>; [key: string]: unknown };
  source_identity?: { canonical: string; template_vars: Record<string, { from?: string | null; transform?: string | null }> } | null;
  adapters: {
    required: string[];
    casda_tap_url?: string | null;
    vizier_tap_url?: string | null;
    tap: { timeout_seconds: number; retries: number; fail_open?: boolean };
  };
  graph?: { url?: string | null; path?: string | null } | null;
  discovery: {
    queries: DiscoveryQueryDraft[];
    enrichments: DiscoveryQueryDraft[];
    prepare_metadata?: {
      field_map: Record<string, MappingDraft>;
      discovery_flags: Record<string, MappingDraft>;
      signature?: { exclude_fields: string[]; include_discovery_flags: boolean } | null;
    } | null;
  };
  manifest?: {
    path: string;
    group_by: string[];
    expand_from?: string | null;
    source_template: Record<string, unknown>;
    dataset_template?: Record<string, unknown> | null;
  } | null;
  graph_patches: Array<{ match: { kind: string; equals: string }; set: Record<string, unknown> }>;
  automation: {
    discovery?: {
      enabled: boolean;
      batch_size: number;
      claim_ttl_minutes: number;
      concurrent_discovery_batch_limit?: number | null;
      queue_max_depth?: number | null;
      stale_after_hours: number;
      tick_discovery_batch_limit?: number | null;
      tick_discovery_source_limit: number;
    } | null;
    execution?: {
      enabled: boolean;
      archive_name: string;
      claim_ttl_minutes: number;
      concurrent_execution_run_limit?: number | null;
      deployment_profile_name?: string | null;
      max_sources_per_execution: number;
      max_wait_minutes: number;
      min_sources_to_trigger: number;
      tick_execution_run_limit: number;
      tick_execution_source_limit: number;
      execution_rest_remote_poll_interval_seconds?: number | null;
      execution_rest_remote_poll_max_rounds?: number | null;
      execution_slurm_remote_poll_interval_seconds?: number | null;
      execution_slurm_remote_poll_max_rounds?: number | null;
    } | null;
  };
  [key: string]: unknown;
}

export function createProjectDraft(id = "new_project"): ProjectDraft {
  return {
    apiVersion: "beampipe.dev/v2",
    kind: "ProjectConfig",
    metadata: { id, description: "" },
    definitions: { transforms: {} },
    source_identity: {
      canonical: "source_identifier",
      template_vars: { source_identifier: { from: "canonical" } },
    },
    adapters: {
      required: ["casda"],
      tap: { timeout_seconds: 90, retries: 2, fail_open: false },
    },
    graph: {},
    discovery: {
      queries: [],
      enrichments: [],
      prepare_metadata: {
        field_map: {
          source_identifier: { from: "source_identifier" },
          dataset_id: { from: "dataset_id" },
          sbid: { from: "sbid" },
        },
        discovery_flags: {},
        signature: { exclude_fields: [], include_discovery_flags: true },
      },
    },
    manifest: {
      path: "manifest.json",
      group_by: ["source_identifier", "sbid"],
      source_template: { source_identifier: "{source_identifier}" },
    },
    graph_patches: [],
    automation: {
      discovery: {
        enabled: false,
        batch_size: 10,
        claim_ttl_minutes: 30,
        stale_after_hours: 24,
        tick_discovery_source_limit: 100,
        tick_discovery_batch_limit: 10,
        concurrent_discovery_batch_limit: 4,
      },
      execution: {
        enabled: false,
        archive_name: "casda",
        claim_ttl_minutes: 180,
        max_sources_per_execution: 1,
        max_wait_minutes: 1_440,
        min_sources_to_trigger: 1,
        tick_execution_run_limit: 10,
        tick_execution_source_limit: 100,
        concurrent_execution_run_limit: 4,
        execution_rest_remote_poll_interval_seconds: 10,
        execution_rest_remote_poll_max_rounds: 360,
        execution_slurm_remote_poll_interval_seconds: 60,
        execution_slurm_remote_poll_max_rounds: 120,
      },
    },
  };
}

export function isProjectDraft(value: unknown): value is ProjectDraft {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  const metadata = objectValue(candidate.metadata);
  return typeof candidate.apiVersion === "string" && typeof candidate.kind === "string" && typeof metadata?.id === "string";
}

export function normalizeProjectDraft(value: unknown): ProjectDraft {
  const input = objectValue(value) ?? {};
  const inputMetadata = objectValue(input.metadata);
  const id = typeof inputMetadata?.id === "string" && inputMetadata.id ? inputMetadata.id : "new_project";
  const defaults = createProjectDraft(id);
  const merged = mergeObjects(defaults, input) as ProjectDraft;

  merged.metadata = requiredObject(merged.metadata, defaults.metadata);
  merged.adapters = requiredObject(merged.adapters, defaults.adapters);
  merged.adapters.required = stringArray(merged.adapters.required, defaults.adapters.required);
  merged.adapters.tap = requiredObject(merged.adapters.tap, defaults.adapters.tap);
  merged.discovery = requiredObject(merged.discovery, defaults.discovery);
  merged.discovery.queries = queryArray(merged.discovery.queries);
  merged.discovery.enrichments = queryArray(merged.discovery.enrichments);
  merged.graph_patches = graphPatchArray(merged.graph_patches);
  merged.automation = requiredObject(merged.automation, defaults.automation);
  merged.automation.discovery = optionalObject(merged.automation.discovery, defaults.automation.discovery);
  merged.automation.execution = optionalObject(merged.automation.execution, defaults.automation.execution);
  if (merged.definitions != null) {
    merged.definitions = requiredObject(merged.definitions, defaults.definitions ?? {});
    merged.definitions.transforms = recordValue(merged.definitions.transforms);
  }
  if (merged.source_identity != null) {
    merged.source_identity = requiredObject(merged.source_identity, defaults.source_identity!);
    merged.source_identity.template_vars = recordValue(merged.source_identity.template_vars);
  }
  if (merged.discovery.prepare_metadata != null) {
    const fallback = defaults.discovery.prepare_metadata!;
    merged.discovery.prepare_metadata = requiredObject(merged.discovery.prepare_metadata, fallback);
    merged.discovery.prepare_metadata.field_map = recordValue(merged.discovery.prepare_metadata.field_map);
    merged.discovery.prepare_metadata.discovery_flags = recordValue(merged.discovery.prepare_metadata.discovery_flags);
    if (merged.discovery.prepare_metadata.signature != null) {
      merged.discovery.prepare_metadata.signature = requiredObject(merged.discovery.prepare_metadata.signature, fallback.signature!);
      merged.discovery.prepare_metadata.signature.exclude_fields = stringArray(merged.discovery.prepare_metadata.signature.exclude_fields, []);
    }
  }
  if (merged.manifest != null) {
    merged.manifest = requiredObject(merged.manifest, defaults.manifest!);
    merged.manifest.group_by = stringArray(merged.manifest.group_by, defaults.manifest!.group_by);
    merged.manifest.source_template = recordValue(merged.manifest.source_template);
    if (merged.manifest.dataset_template != null) merged.manifest.dataset_template = recordValue(merged.manifest.dataset_template);
  }
  return merged;
}

export function validateProjectDraft(draft: ProjectDraft) {
  const errors: string[] = [];
  if (draft.apiVersion !== "beampipe.dev/v2") errors.push("API version must be beampipe.dev/v2");
  if (draft.kind !== "ProjectConfig") errors.push("Kind must be ProjectConfig");
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(draft.metadata.id)) errors.push("Project ID must use lowercase letters, digits, underscores, or dashes");
  if (!draft.adapters.required.length) errors.push("At least one adapter is required");
  if (draft.graph?.url && draft.graph.path) errors.push("Choose either a graph URL or a local graph path, not both");
  for (const query of [...draft.discovery.queries, ...draft.discovery.enrichments]) {
    if (!query.name.trim() || !query.adapter.trim() || !query.template.trim()) errors.push("Every discovery query needs a name, adapter, and template");
  }
  const execution = draft.automation.execution;
  if (execution && execution.min_sources_to_trigger > execution.max_sources_per_execution) {
    errors.push("Minimum sources to trigger cannot exceed sources per execution");
  }
  return [...new Set(errors)];
}

function mergeObjects(base: unknown, incoming: unknown): unknown {
  if (Array.isArray(incoming)) return structuredClone(incoming);
  if (!incoming || typeof incoming !== "object") return incoming;
  const result = base && typeof base === "object" && !Array.isArray(base)
    ? structuredClone(base as Record<string, unknown>)
    : {};
  for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
    (result as Record<string, unknown>)[key] = value && typeof value === "object" && !Array.isArray(value)
      ? mergeObjects((result as Record<string, unknown>)[key], value)
      : structuredClone(value);
  }
  return result;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function requiredObject<T extends object>(value: unknown, fallback: T): T {
  return objectValue(value) ? mergeObjects(fallback, value) as T : structuredClone(fallback);
}

function optionalObject<T extends object>(value: unknown, fallback: T | null | undefined): T | null {
  if (value === null) return null;
  return requiredObject(value, fallback ?? {} as T);
}

function recordValue(value: unknown): Record<string, never> {
  return (objectValue(value) ?? {}) as Record<string, never>;
}

function stringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : structuredClone(fallback);
}

function queryArray(value: unknown): DiscoveryQueryDraft[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = objectValue(item) ?? {};
    return {
      ...row,
      name: typeof row.name === "string" ? row.name : "",
      adapter: typeof row.adapter === "string" ? row.adapter : "",
      template: typeof row.template === "string" ? row.template : "",
    } as DiscoveryQueryDraft;
  });
}

function graphPatchArray(value: unknown): ProjectDraft["graph_patches"] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = objectValue(item) ?? {};
    const match = objectValue(row.match) ?? {};
    return {
      ...row,
      match: {
        kind: typeof match.kind === "string" ? match.kind : "node_name",
        equals: typeof match.equals === "string" ? match.equals : "",
      },
      set: objectValue(row.set) ?? {},
    } as ProjectDraft["graph_patches"][number];
  });
}

export function updateDraft<T extends object>(draft: T, path: Array<string | number>, value: unknown): T {
  const clone = structuredClone(draft);
  let cursor: Record<string | number, unknown> = clone as Record<string | number, unknown>;
  path.forEach((part, index) => {
    if (index === path.length - 1) {
      cursor[part] = value;
      return;
    }
    const next = cursor[part];
    if (!next || typeof next !== "object") cursor[part] = typeof path[index + 1] === "number" ? [] : {};
    cursor = cursor[part] as Record<string | number, unknown>;
  });
  return clone;
}
