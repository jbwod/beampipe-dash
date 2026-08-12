export interface OperatorOverview {
  generated_at: string;
  registered_sources: number;
  pending_admissions: number;
  running_executions: number;
  failed_executions: number;
  queue_depth: number;
  active_workers: number;
  stale_workers: number;
  recent_alerts: number;
  casda: string;
  daliuge: string;
  scheduler: string;
}

export interface CurrentUser {
  username: string;
  name: string;
  email?: string;
  is_superuser: boolean;
}

export interface ReadyStatus {
  status: string;
  service: string;
  database: string;
  redis: string;
  tap_casda: string;
  tap_vizier: string;
  queue_depth: number;
  jobs_running: number;
}

export interface Execution {
  uuid: string;
  project_module: string;
  archive_name: string;
  sources: unknown;
  status: string;
  execution_phase: string | null;
  control_phase: string | null;
  scheduler_name: string | null;
  scheduler_job_id: string | null;
  scheduler_state: string | null;
  scheduler_raw_state: string | null;
  scheduler_reason: string | null;
  daliuge_session_id: string | null;
  daliuge_state: string | null;
  output_state: string | null;
  terminal_outcome: string | null;
  failure_class: string | null;
  last_error: string | null;
  retry_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_reconciled_at: string | null;
  deployment_profile_id: string | null;
  project_config_version: number | null;
  deployment_profile_revision?: number | null;
  project_config_id?: string | null;
  discovery_signature?: string | null;
  manifest_sha256?: string | null;
  source_graph_sha256?: string | null;
  patched_graph_sha256?: string | null;
  physical_graph_sha256?: string | null;
  submission_state?: string | null;
  phase_timestamps?: unknown;
  workflow_manifest?: unknown;
  beampipe_run_record?: unknown;
  remote_session_dir?: string | null;
  dim_session_status_url?: string | null;
  dim_graph_status_url?: string | null;
  slurm_login_node?: string | null;
  slurm_remote_user?: string | null;
  slurm_session_dir?: string | null;
  [key: string]: unknown;
}

export interface ExecutionStatusDetail {
  uuid: string;
  status: string;
  execution_phase: string | null;
  control_phase: string | null;
  submission_state: string | null;
  scheduler_name: string | null;
  scheduler_job_id: string | null;
  scheduler_state: string | null;
  scheduler_raw_state: string | null;
  scheduler_reason: string | null;
  daliuge_session_id: string | null;
  daliuge_state: string | null;
  output_state: string | null;
  terminal_outcome: string | null;
  failure_class: string | null;
  last_error: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  slurm_state: string | null;
  dim_state: string | null;
  last_observation_at: string | null;
  duration_seconds: number | null;
}

export interface ExecutionSummary {
  uuid: string;
  project_module: string;
  archive_name: string;
  status: string;
  requested_source_count: number;
  requested_source_identifiers: string[];
  scheduler_name: string | null;
  scheduler_job_id: string | null;
  daliuge_session_id: string | null;
  control_phase: string | null;
  scheduler_state: string | null;
  daliuge_state: string | null;
  terminal_outcome: string | null;
  last_error: string | null;
}

export interface ProvenanceEvent {
  id: string;
  occurred_at: string;
  event_type: string;
  project_module: string;
  source_identifier: string | null;
  execution_id: string | null;
  actor: string | null;
  correlation_id: string | null;
  payload: unknown;
}

export interface ExecutionObservation {
  uuid: string;
  execution_id: string;
  kind: string;
  normalized_state: string;
  raw_state: string | null;
  reason: string | null;
  source_version: string | null;
  payload: unknown;
  observed_at: string;
}

export interface ExecutionArtifact {
  uuid: string;
  execution_id: string;
  kind: string;
  storage_kind: string;
  media_type: string;
  sha256: string;
  size_bytes: number | null;
  producer_phase: string;
  uri: string | null;
  inline_json: unknown;
  metadata: unknown;
  created_at: string;
}

export interface LedgerSnapshot {
  uuid: string;
  status: string;
  execution_phase: string | null;
  scheduler_name: string | null;
  scheduler_job_id: string | null;
  correlation_id?: string;
  active_job_id?: string;
  workflow_manifest?: unknown;
  last_error: string | null;
  run_record_phases: unknown;
  provenance_summary: {
    config_version: number | null;
    discovery_signature: string | null;
    recent_events: ProvenanceEvent[];
  };
}

export interface PaginatedExecutions {
  items: Execution[];
  total: number;
  page: number;
  items_per_page: number;
}

export interface SourceRegistryRow {
  uuid: string;
  project_module: string;
  source_identifier: string;
  enabled: boolean;
  created_at: string;
  last_checked_at: string | null;
  last_attempted_at: string | null;
  stale_after_hours: number | null;
  discovery_signature: string | null;
  last_executed_discovery_signature: string | null;
  discovery_claim_token: string | null;
  discovery_claim_expires_at: string | null;
  workflow_run_pending: boolean;
  workflow_run_pending_at: string | null;
  workflow_claim_token: string | null;
  workflow_claimed_at: string | null;
  workflow_claim_expires_at: string | null;
}

export interface ProjectListItem {
  project_id: string;
  version: number;
  active: boolean;
}

export interface ValidationDiagnostic {
  severity?: string;
  code?: string;
  path?: string;
  message?: string;
  hint?: string | null;
}

export interface ValidationReport {
  project_id?: string;
  valid?: boolean;
  errors?: ValidationDiagnostic[];
  warnings?: ValidationDiagnostic[];
  spec_sha256?: string;
  [key: string]: unknown;
}

export interface Worker {
  id: string;
  instance_name: string;
  host: string;
  process_id: number | null;
  role: string;
  pool: string;
  capabilities: string[];
  labels: unknown;
  version: string;
  concurrency_limit: number;
  status: string;
  health: string;
  active_leases: number;
  heartbeat_age_seconds: number;
  started_at: string;
  last_heartbeat_at: string;
  draining_at: string | null;
  stopped_at: string | null;
}

export interface WorkerPool {
  pool: string;
  active_workers: number;
  draining_workers: number;
  unhealthy_workers: number;
  concurrency_limit: number;
  active_leases: number;
}

export interface WorkerLease {
  job_id: string;
  kind: string;
  execution_id: string | null;
  worker_id: string | null;
  claim_id: string | null;
  pool: string;
  required_capability: string | null;
  attempts: number;
  lease_expires_at: string | null;
  heartbeat_at: string | null;
}

export interface SchedulerJob {
  execution_id: string;
  project_module: string;
  execution_status: string;
  scheduler_job_id: string | null;
  scheduler_state: string | null;
  scheduler_raw_state: string | null;
  scheduler_reason: string | null;
  daliuge_session_id: string | null;
  remote_session_dir: string | null;
  submitted_at: string;
  last_reconciled_at: string | null;
}

export interface Diagnostic {
  path?: string;
  code?: string;
  severity: string;
  message: string;
  hint?: string | null;
}

export interface DiagnosticsResponse {
  healthy: boolean;
  generated_at: string;
  diagnostics: Diagnostic[];
}
