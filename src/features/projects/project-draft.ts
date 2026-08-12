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
  return typeof candidate.apiVersion === "string" && typeof candidate.kind === "string" && !!candidate.metadata && typeof candidate.metadata === "object";
}

export function normalizeProjectDraft(value: ProjectDraft): ProjectDraft {
  return mergeObjects(createProjectDraft(value.metadata?.id || "new_project"), value) as ProjectDraft;
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
