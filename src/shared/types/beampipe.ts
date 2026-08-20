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

export interface ExecutionCreatePayload {
  project_module: string;
  sources: Array<{ source_identifier: string; sbids?: string[] }>;
  archive_name: string;
  deployment_profile_id?: string | null;
  deployment_profile_name?: string | null;
}

export interface ExecutionPrepareResponse {
  project_module: string;
  valid: boolean;
  errors: string[];
  total_datasets: number;
  sources_preview: Array<{
    source_identifier: string;
    sbid_count: number;
    dataset_count: number;
  }>;
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

export interface SourceExecutionStatus {
  ready_for_execution: boolean;
  discovery_complete: boolean;
  workflow_run_pending: boolean;
  discovery_signature: string | null;
  last_executed_discovery_signature: string | null;
  signature_matches_last_execution: boolean;
  blockers: string[];
  pending_age_seconds?: number | null;
}

export interface ArchiveMetadata {
  uuid: string;
  project_module: string;
  source_identifier: string;
  sbid: string;
  metadata_json: unknown;
  created_at: string;
  updated_at: string | null;
}

export interface SourceMetadataResponse {
  source: SourceRegistryRow;
  metadata: ArchiveMetadata[];
  metadata_count: number;
}

export interface SourceBulkCreateResponse {
  items: SourceRegistryRow[];
  total: number;
}

export interface DiscoverTriggerResponse {
  project_module: string;
  marked_count: number;
  source_identifiers: string[];
  message: string;
}

export interface ProjectListItem {
  project_id: string;
  version: number;
  active: boolean;
}

export interface ProjectConfigRow {
  uuid: string;
  project_id: string;
  version: number;
  spec: unknown;
  spec_sha256: string;
  active: boolean;
  uploaded_at: string;
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

export interface DaliugeTranslationConfig {
  algo: "metis" | "mysarkar";
  num_par: number;
  num_islands: number;
  tm_url?: string | null;
}

export interface RestRemoteDeployment {
  kind: "rest_remote";
  dim_host_for_tm?: string | null;
  dim_port_for_tm?: number | null;
  deploy_host: string;
  deploy_port?: number | null;
  use_https: boolean;
  verify_ssl: boolean;
}

export interface SlurmResourceConfig {
  partition?: string | null;
  nodes?: number | null;
  tasks?: number | null;
  cpus_per_task?: number | null;
  memory?: string | null;
  wall_time_minutes?: number | null;
  constraint?: string | null;
  quality_of_service?: string | null;
}

export interface DaliugeManagerTopologyConfig {
  nodes?: number | null;
  islands?: number | null;
  co_host_dim: boolean;
}

export interface SlurmRemoteDeployment {
  kind: "slurm_remote";
  login_node: string;
  ssh_port: number;
  remote_user?: string | null;
  ssh_credential?: string | null;
  account: string;
  home_dir: string;
  log_dir: string;
  exec_prefix: string;
  dlg_root: string;
  venv?: string | null;
  modules?: string | null;
  facility: string;
  job_duration_minutes: number;
  num_nodes: number;
  num_islands: number;
  verbose_level: number;
  max_threads: number;
  all_nics: boolean;
  zerorun: boolean;
  sleepncopy: boolean;
  check_with_session: boolean;
  verify_ssl?: boolean | null;
  slurm_template?: string | null;
  resources: SlurmResourceConfig;
  manager_topology: DaliugeManagerTopologyConfig;
  container_runtime?: string | null;
  environment_setup?: string | null;
}

export interface DeploymentProfile {
  name: string;
  description?: string | null;
  project_module?: string | null;
  is_default: boolean;
  max_concurrent_executions?: number | null;
  translation: DaliugeTranslationConfig;
  deployment: RestRemoteDeployment | SlurmRemoteDeployment;
}

export interface DeploymentProfileResponse extends DeploymentProfile {
  uuid: string;
  revision: number;
  spec_sha256?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface SlurmCredentialSlot {
  name: string;
  private_key: boolean;
  public_key: boolean;
  passphrase: boolean;
  known_hosts: boolean;
}

export interface SlurmCredentialListResponse {
  slots: SlurmCredentialSlot[];
}

export interface DaliugeInspectResponse {
  profile: string | null;
  translator: unknown;
  manager: unknown | null;
}

export interface SchedulerStatusResponse {
  profile: string;
  connectivity: unknown;
  resource_request: unknown;
  rendered_resource_request: string;
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

export interface NotificationChannel {
  uuid: string;
  name: string;
  kind: "webhook" | "email" | string;
  config: Record<string, unknown>;
  secret_fields: string[];
  configured_fields: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface AlertRule {
  uuid: string;
  name: string;
  project_module: string | null;
  enabled: boolean;
  severity: string;
  trigger_kind: string;
  trigger_config: Record<string, unknown>;
  channel_ids: string[];
  cooldown_minutes: number;
  last_fired_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AlertDelivery {
  uuid: string;
  rule_id: string | null;
  channel_id: string | null;
  status: string;
  payload: Record<string, unknown> | unknown;
  error: string | null;
  created_at: string;
}

export interface NotificationChannelTestResponse {
  delivery_id: string;
  status: string;
}
