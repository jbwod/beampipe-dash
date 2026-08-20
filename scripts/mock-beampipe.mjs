import http from "node:http";

const now = Date.now();
const mockHost = process.env.BEAMPIPE_MOCK_HOST ?? "127.0.0.1";
const mockPort = Number.parseInt(process.env.BEAMPIPE_MOCK_PORT ?? "18080", 10);
const iso = (offset = 0) => new Date(now + offset).toISOString();
const run = (id, project, status, phase, minutes, backend = null) => ({
  uuid: id,
  project_module: project,
  archive_name: "CASDA",
  sources: status === "running" ? ["J103729-261901", "J104059-270456"] : ["J100102-270112"],
  status,
  execution_phase: phase,
  control_phase: status === "completed" ? "terminal" : "executing",
  scheduler_name: backend,
  scheduler_job_id: backend === "slurm" ? "784201" : null,
  scheduler_state: backend === "slurm" ? "RUNNING" : null,
  scheduler_raw_state: null,
  scheduler_reason: null,
  daliuge_session_id: backend === "slurm" ? null : `bp-${id.slice(0, 8)}`,
  daliuge_state: status === "running" ? "RUNNING" : status.toUpperCase(),
  output_state: status === "completed" ? "verified" : null,
  terminal_outcome: status === "completed" ? "success" : null,
  failure_class: status === "failed" ? "backend" : null,
  last_error: status === "failed" ? "DIM deployment did not reach a terminal success state" : null,
  retry_count: status === "failed" ? 1 : 0,
  created_at: iso(-minutes * 60_000),
  started_at: iso(-(minutes - 1) * 60_000),
  completed_at: ["completed", "failed"].includes(status) ? iso(-(minutes - 8) * 60_000) : null,
  last_reconciled_at: iso(-15_000),
  deployment_profile_id: null,
  project_config_version: 3,
});

const runs = [
  run("019b37af-4f6c-7d7a-9a73-111111111111", "wallaby_hires", "running", "polling", 12),
  run("019b37af-4f6c-7d7a-9a73-222222222222", "wallaby_hires", "awaiting_scheduler", "submitted", 26, "slurm"),
  run("019b37af-4f6c-7d7a-9a73-333333333333", "hipass_demo", "completed", null, 82),
  run("019b37af-4f6c-7d7a-9a73-444444444444", "wallaby_hires", "failed", null, 190),
];

const sources = [
  { uuid: "019b37af-0000-7000-8000-000000000001", project_module: "wallaby_hires", source_identifier: "J103729-261901", enabled: true, created_at: iso(-86_400_000), last_checked_at: iso(-600_000), last_attempted_at: iso(-600_000), stale_after_hours: 24, discovery_signature: "44a18cf0c05a557f", last_executed_discovery_signature: "44a18cf0c05a557f", discovery_claim_token: null, discovery_claim_expires_at: null, workflow_run_pending: false, workflow_run_pending_at: null, workflow_claim_token: null, workflow_claimed_at: null, workflow_claim_expires_at: null },
  { uuid: "019b37af-0000-7000-8000-000000000002", project_module: "wallaby_hires", source_identifier: "J104059-270456", enabled: true, created_at: iso(-86_400_000), last_checked_at: iso(-1_200_000), last_attempted_at: iso(-1_200_000), stale_after_hours: 24, discovery_signature: "927e16be3e28a71f", last_executed_discovery_signature: null, discovery_claim_token: null, discovery_claim_expires_at: null, workflow_run_pending: true, workflow_run_pending_at: iso(-1_100_000), workflow_claim_token: null, workflow_claimed_at: null, workflow_claim_expires_at: null },
  { uuid: "019b37af-0000-7000-8000-000000000003", project_module: "wallaby_hires", source_identifier: "J100102-270112", enabled: true, created_at: iso(-86_400_000), last_checked_at: null, last_attempted_at: iso(-45_000), stale_after_hours: 24, discovery_signature: null, last_executed_discovery_signature: null, discovery_claim_token: "demo-claim-redacted", discovery_claim_expires_at: iso(240_000), workflow_run_pending: false, workflow_run_pending_at: null, workflow_claim_token: null, workflow_claimed_at: null, workflow_claim_expires_at: null },
  { uuid: "019b37af-0000-7000-8000-000000000004", project_module: "hipass_demo", source_identifier: "HIPASS J1250-20", enabled: false, created_at: iso(-172_800_000), last_checked_at: iso(-36_000_000), last_attempted_at: iso(-36_000_000), stale_after_hours: null, discovery_signature: "5ad066a9c10b", last_executed_discovery_signature: null, discovery_claim_token: null, discovery_claim_expires_at: null, workflow_run_pending: false, workflow_run_pending_at: null, workflow_claim_token: null, workflow_claimed_at: null, workflow_claim_expires_at: null },
];

const detailRun = {
  ...runs[0],
  control_phase: "submitted",
  submission_state: "submitted",
  deployment_profile_id: "019b37af-5000-7000-8000-000000000001",
  deployment_profile_revision: 4,
  project_config_id: "019b37af-6000-7000-8000-000000000001",
  project_config_version: 3,
  discovery_signature: "44a18cf0c05a557f927e16be3e28a71f",
  manifest_sha256: "99030a6b91ecf9a0e50684cc0cbdcdfe",
  source_graph_sha256: "6f1c7df5be3a5f6e713c8ac27d61c354",
  patched_graph_sha256: "e6a0b7aee304ea676f32ed553f2bae85",
  physical_graph_sha256: "af37e7a4d73e256d02789e984b66a7af",
  phase_timestamps: { prepare_started_at: iso(-720_000), staging_completed_at: iso(-660_000), graph_patched_at: iso(-620_000), submitted_at: iso(-580_000), polling_started_at: iso(-550_000) },
  workflow_manifest: { sources: [{ source_identifier: "J103729-261901", sbids: [{ sbid: 45512, datasets: 6 }] }, { source_identifier: "J104059-270456", sbids: [{ sbid: 45514, datasets: 4 }] }], beampipe_run_record: { staging: { outcome: "completed", usable_datasets: 10 }, dim: { session_id: "bp-019b37af", last_observation: { session_state: "RUNNING", observed_at: iso(-12_000) } } } },
  beampipe_run_record: { staging: { outcome: "completed", usable_datasets: 10 }, dim: { session_id: "bp-019b37af", last_observation: { session_state: "RUNNING", observed_at: iso(-12_000) } } },
  dim_session_status_url: "http://127.0.0.1:8001/api/sessions/bp-019b37af/status",
  dim_graph_status_url: "http://127.0.0.1:8001/api/sessions/bp-019b37af/graph/status",
};

const events = [
  { id: "019b37af-7000-7000-8000-000000000001", occurred_at: iso(-720_000), event_type: "execution.created", project_module: "wallaby_hires", source_identifier: null, execution_id: detailRun.uuid, actor: "scheduler", correlation_id: "corr-demo-01", payload: { source_count: 2, profile_revision: 4 } },
  { id: "019b37af-7000-7000-8000-000000000002", occurred_at: iso(-580_000), event_type: "execution.submitted", project_module: "wallaby_hires", source_identifier: null, execution_id: detailRun.uuid, actor: "worker:rest-01", correlation_id: "corr-demo-01", payload: { backend: "daliuge", session_id: "bp-019b37af" } },
];

const observations = [
  { uuid: "019b37af-8000-7000-8000-000000000001", execution_id: detailRun.uuid, kind: "dim_session", normalized_state: "running", raw_state: "RUNNING", reason: null, source_version: "DIM 4.0", payload: { status: "RUNNING", graph_errors: [] }, observed_at: iso(-12_000) },
  { uuid: "019b37af-8000-7000-8000-000000000002", execution_id: detailRun.uuid, kind: "dim_session", normalized_state: "submitted", raw_state: "DEPLOYED", reason: null, source_version: "DIM 4.0", payload: { status: "DEPLOYED" }, observed_at: iso(-540_000) },
];

const graph = { modelData: { filePath: "wallaby-hires-test.graph", schemaVersion: "OJS" }, nodeDataArray: [{ key: "ingest", name: "beampipe-ingest", category: "PythonApp", fields: [{ name: "manifest", value: "manifest.json" }] }, { key: "scatter", name: "Scatter/GenericScatterApp/Beam", category: "Scatter", fields: [{ name: "num_of_copies", value: 2 }] }], linkDataArray: [{ from: "ingest", to: "scatter" }] };
const artifacts = [
  { uuid: "019b37af-9000-7000-8000-000000000001", execution_id: detailRun.uuid, kind: "manifest", storage_kind: "database", media_type: "application/json", sha256: detailRun.manifest_sha256, size_bytes: 2048, producer_phase: "manifest_generated", uri: null, inline_json: detailRun.workflow_manifest, metadata: { project_module: "wallaby_hires" }, created_at: iso(-640_000) },
  { uuid: "019b37af-9000-7000-8000-000000000002", execution_id: detailRun.uuid, kind: "source_graph", storage_kind: "database", media_type: "application/json", sha256: detailRun.source_graph_sha256, size_bytes: 6144, producer_phase: "graph_loaded", uri: "https://github.com/jbwod/wallaby-hires-beampipe/blob/main/dlg-graphs/wallaby-hires_test-pipeline-nodownloads-beampipe.graph", inline_json: graph, metadata: { immutable: true }, created_at: iso(-630_000) },
  { uuid: "019b37af-9000-7000-8000-000000000003", execution_id: detailRun.uuid, kind: "patched_graph", storage_kind: "database", media_type: "application/json", sha256: detailRun.patched_graph_sha256, size_bytes: 6220, producer_phase: "graph_patched", uri: null, inline_json: graph, metadata: { manifest_path: "manifest.json", manifest_sha256: detailRun.manifest_sha256 }, created_at: iso(-620_000) },
];

const projectSpec = {
  apiVersion: "beampipe.dev/v2",
  kind: "ProjectConfig",
  metadata: { id: "wallaby_hires", description: "WALLABY HiRes no-downloads pipeline" },
  definitions: { transforms: { hipass_source_name: { kind: "strip_prefix", prefix: "HIPASS" }, normalized_sbid: { kind: "extract_digits" }, has_rows: { kind: "is_present" } } },
  source_identity: { canonical: "source_identifier", template_vars: { source_identifier: { from: "canonical" }, source_name: { transform: "hipass_source_name" } } },
  adapters: { required: ["casda", "vizier"], tap: { timeout_seconds: 90, retries: 2, fail_open: false } },
  graph: { url: "https://github.com/jbwod/wallaby-hires-beampipe/blob/main/dlg-graphs/wallaby-hires_test-pipeline-nodownloads-beampipe.graph" },
  discovery: {
    queries: [{ name: "visibility", adapter: "casda", template: "SELECT o.* FROM ivoa.obscore o\nWHERE o.filename LIKE '{source_identifier}%'\nAND o.obs_collection IN ('ASKAP Pilot Survey for WALLABY', 'WALLABY')" }, { name: "ra_dec_vsys", adapter: "vizier", template: "SELECT HIPASS, RAJ2000, DEJ2000, RVmom\nFROM \"VIII/73/hicat\" WHERE HIPASS = '{source_name}'" }],
    enrichments: [{ name: "sbid_to_eval_file", adapter: "casda", template: "SELECT * FROM casda.observation_evaluation_file\nWHERE sbid = '{sbid}'" }],
    prepare_metadata: { field_map: { source_identifier: { from: "source_identifier" }, dataset_id: { from: "filename" }, visibility_filename: { from: "filename" }, sbid: { from: "obs_id", transform: "normalized_sbid" } }, discovery_flags: { ra_dec_vsys_complete: { from: "enrichments.ra_dec_vsys", transform: "has_rows" } }, signature: { exclude_fields: ["access_url", "filesize", "t_max", "t_min"], include_discovery_flags: true } },
  },
  manifest: { path: "manifest.json", group_by: ["source_identifier", "sbid"], source_template: { source_identifier: "{source_identifier}", ra_string: "{flags.ra_string}", dec_string: "{flags.dec_string}", vsys: "{flags.vsys}" } },
  graph_patches: [{ match: { kind: "node_name", equals: "Scatter/GenericScatterApp/Beam" }, set: { num_of_copies: "$count(sbids[].datasets[])" } }],
  automation: { discovery: { enabled: true, batch_size: 10, claim_ttl_minutes: 30, stale_after_hours: 24, tick_discovery_source_limit: 1000, tick_discovery_batch_limit: 100, concurrent_discovery_batch_limit: 24 }, execution: { enabled: true, archive_name: "casda", claim_ttl_minutes: 180, deployment_profile_name: "rest-local", max_sources_per_execution: 2, max_wait_minutes: 1440, min_sources_to_trigger: 1, tick_execution_run_limit: 50, tick_execution_source_limit: 1000, concurrent_execution_run_limit: 10, execution_rest_remote_poll_interval_seconds: 10, execution_rest_remote_poll_max_rounds: 360, execution_slurm_remote_poll_interval_seconds: 60, execution_slurm_remote_poll_max_rounds: 120 } },
};
const projectRows = [{ uuid: "019b37af-b000-7000-8000-000000000003", project_id: "wallaby_hires", version: 3, spec: projectSpec, spec_sha256: "c33c29af1bf4c9a1f1e342a5", active: true, uploaded_at: iso(-86_400_000) }, { uuid: "019b37af-b000-7000-8000-000000000002", project_id: "wallaby_hires", version: 2, spec: { ...projectSpec, metadata: { ...projectSpec.metadata, description: "WALLABY HiRes previous revision" } }, spec_sha256: "b32b29af1bf4c9a1f1e342a5", active: false, uploaded_at: iso(-172_800_000) }];
const restProfile = { uuid: "019b37af-c000-7000-8000-000000000001", name: "rest-local", description: "Local DALiuGE development cluster", project_module: "wallaby_hires", is_default: true, max_concurrent_executions: 4, revision: 4, spec_sha256: "5cc40f0b1e5e93a2", translation: { algo: "metis", num_par: 1, num_islands: 0, tm_url: "http://host.docker.internal:8084" }, deployment: { kind: "rest_remote", dim_host_for_tm: "host.docker.internal", dim_port_for_tm: 8001, deploy_host: "host.docker.internal", deploy_port: 8001, use_https: false, verify_ssl: true }, created_at: iso(-604_800_000), updated_at: iso(-86_400_000) };
const slurmProfile = { uuid: "019b37af-c000-7000-8000-000000000002", name: "setonix", description: "WALLABY HiRes production scheduler", project_module: "wallaby_hires", is_default: false, max_concurrent_executions: 12, revision: 7, spec_sha256: "813e41b0042df8b0", translation: { algo: "metis", num_par: 1, num_islands: 1, tm_url: "http://dlg-tm.internal:8084" }, deployment: { kind: "slurm_remote", login_node: "setonix.pawsey.org.au", ssh_port: 22, remote_user: "beampipe", account: "pawsey0411", home_dir: "/scratch/pawsey0411", log_dir: "/scratch/pawsey0411/beampipe/logs", exec_prefix: "srun -l", dlg_root: "/scratch/pawsey0411/beampipe/dlg", venv: "source /software/projects/pawsey0411/beampipe/bin/activate", modules: "module load singularity/4.1.0-askap", facility: "setonix", job_duration_minutes: 50, num_nodes: 1, num_islands: 1, verbose_level: 1, max_threads: 0, all_nics: false, zerorun: false, sleepncopy: false, check_with_session: false, verify_ssl: true, slurm_template: null, resources: { partition: "work", nodes: 2, tasks: 2, cpus_per_task: 8, memory: "64G", wall_time_minutes: 50, constraint: null, quality_of_service: null }, manager_topology: { nodes: 1, islands: 1, co_host_dim: false }, container_runtime: "singularity", environment_setup: null }, created_at: iso(-1_209_600_000), updated_at: iso(-43_200_000) };
const deploymentProfiles = [restProfile, slurmProfile];
const slackChannel = { uuid: "019b37af-d100-7000-8000-000000000001", name: "ops-slack", kind: "webhook", config: { url: "https://hooks.slack.com/services/T000/B000/mock", template: "slack" }, secret_fields: [], configured_fields: ["url", "template"], enabled: true, created_at: iso(-86_400_000), updated_at: iso(-3_600_000) };
const alertRule = { uuid: "019b37af-d200-7000-8000-000000000001", name: "exec-fail", project_module: "wallaby_hires", enabled: true, severity: "critical", trigger_kind: "execution_terminal", trigger_config: {}, channel_ids: [slackChannel.uuid], cooldown_minutes: 15, last_fired_at: iso(-1_800_000), created_at: iso(-86_400_000), updated_at: iso(-3_600_000) };
const alertDeliveries = [
  { uuid: "019b37af-d300-7000-8000-000000000001", rule_id: alertRule.uuid, channel_id: slackChannel.uuid, status: "sent", payload: { alert: "execution.failed", severity: "critical", project_module: "wallaby_hires", summary: "Execution 019b37af failed: DIM deployment did not reach a terminal success state" }, error: null, created_at: iso(-1_800_000) },
  { uuid: "019b37af-d300-7000-8000-000000000002", rule_id: null, channel_id: slackChannel.uuid, status: "failed", payload: { alert: "test", severity: "info", project_module: "test", summary: "Beampipe test notification" }, error: "HTTP 404", created_at: iso(-600_000) },
];
const notificationChannels = [slackChannel];
const alertRules = [alertRule];

const json = (response, body, status = 200) => {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
};

const readJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
};

http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${mockHost}:${mockPort}`);
  const path = url.pathname;
  if (path === "/api/v2/health") return json(response, { status: "ok", service: "beampipe-v2" });
  if (path === "/api/v2/login" && request.method === "POST") return json(response, { access_token: "mock-access-token", refresh_token: "mock-refresh-token", token_type: "bearer" });
  if (path === "/api/v2/refresh" && request.method === "POST") return json(response, { access_token: "mock-access-token-refreshed", refresh_token: "mock-refresh-token-refreshed", token_type: "bearer" });
  if (path === "/api/v2/logout" && request.method === "POST") return json(response, { logged_out: true });
  if (path === "/api/v2/user/me") return json(response, { username: "operator", name: "Demo Operator", email: "operator@example.test", is_superuser: true });
  if (path === "/api/v2/overview") return json(response, { generated_at: iso(), registered_sources: 4, pending_admissions: 1, running_executions: 2, failed_executions: 1, queue_depth: 5, active_workers: 3, stale_workers: 1, recent_alerts: 2, casda: "configured", daliuge: "configured", scheduler: "configured" });
  if (path === "/api/v2/ready") return json(response, { status: "ready", service: "beampipe-v2", database: "ok", redis: "disabled", tap_casda: "ok", tap_vizier: "ok", queue_depth: 5, jobs_running: 2 });
  if (path === "/api/v2/projects") return json(response, [{ project_id: "wallaby_hires", version: 3, active: true }, { project_id: "hipass_demo", version: 1, active: true }]);
  if (path === "/api/v2/projects/contracts") return json(response, [{ project_id: "wallaby_hires", valid: true, errors: [], warnings: [], spec_sha256: "abc" }, { project_id: "hipass_demo", valid: true, errors: [], warnings: [{ severity: "warning", code: "graph.test", path: "graph", message: "Demo graph" }], spec_sha256: "def" }]);
  if (path === "/api/v2/projects/contracts/wallaby_hires") return json(response, { project_id: "wallaby_hires", valid: true, errors: [], warnings: [], spec_sha256: projectRows[0].spec_sha256 });
  if (path === "/api/v2/project-configs" && request.method === "POST") return json(response, { project_id: "wallaby_hires", valid: true, errors: [], warnings: [{ severity: "warning", code: "demo.saved", path: "metadata.id", message: "Mock project revision accepted" }], spec_sha256: "new-demo-sha" }, 201);
  if (path === "/api/v2/project-configs/wallaby_hires/versions") return json(response, projectRows);
  if (path === "/api/v2/project-configs/wallaby_hires") return json(response, projectRows[0]);
  if (path === "/api/v2/slurm/credentials") return json(response, { slots: [{ name: "hpc", private_key: true, public_key: true, passphrase: false, known_hosts: true }, { name: "setonix", private_key: false, public_key: true, passphrase: false, known_hosts: true }] });
  const slurmSlotMatch = path.match(/^\/api\/v2\/slurm\/credentials\/([^/]+)$/);
  if (slurmSlotMatch) {
    const slots = [{ name: "hpc", private_key: true, public_key: true, passphrase: false, known_hosts: true }, { name: "setonix", private_key: false, public_key: true, passphrase: false, known_hosts: true }];
    const slot = slots.find((item) => item.name === slurmSlotMatch[1]);
    if (!slot) return json(response, { error: "not found", code: "not_found" }, 404);
    return json(response, slot);
  }
  if (path === "/api/v2/deployment-profiles" && request.method === "GET") return json(response, deploymentProfiles);
  if (path === "/api/v2/deployment-profiles" && request.method === "POST") return json(response, { ...restProfile, uuid: "019b37af-c000-7000-8000-000000000003", name: "created-profile", revision: 1, created_at: iso(), updated_at: null }, 201);
  const profileMatch = path.match(/^\/api\/v2\/deployment-profiles\/([^/]+)$/);
  if (profileMatch) {
    const profile = deploymentProfiles.find((item) => item.uuid === profileMatch[1]) ?? restProfile;
    if (request.method === "DELETE") { response.writeHead(204); return response.end(); }
    if (request.method === "PATCH") return json(response, { ...profile, revision: profile.revision + 1, spec_sha256: "revised-mock-sha", updated_at: iso() });
    return json(response, profile);
  }
  if (path === "/api/v2/daliuge/inspect") return json(response, { profile: url.searchParams.get("profile"), translator: { status: "reachable", version: "1.8.0", endpoint: "http://translator:8084" }, manager: { status: "reachable", sessions: 2, endpoint: "http://dim:8001" } });
  if (path === "/api/v2/scheduler/status") return json(response, { profile: url.searchParams.get("profile"), connectivity: { status: "reachable", login_node: "setonix.pawsey.org.au", scheduler: "slurm", key_source: "file", known_hosts: "verified" }, resource_request: { partition: "work", nodes: 2, tasks: 2, cpus_per_task: 8, wall_time_minutes: 50 }, rendered_resource_request: "#SBATCH --account=pawsey0411\n#SBATCH --partition=work\n#SBATCH --nodes=2\n#SBATCH --ntasks=2\n#SBATCH --cpus-per-task=8\n#SBATCH --time=00:50:00" });
  if (path === "/api/v2/sources/bulk" && request.method === "POST") return json(response, { items: sources.slice(0, 2), total: 2 });
  if (path === "/api/v2/sources/discover" && request.method === "POST") return json(response, { project_module: "wallaby_hires", marked_count: 2, source_identifiers: sources.slice(0, 2).map((item) => item.source_identifier), message: "Sources marked for rediscovery" });
  if (path === "/api/v2/sources") return json(response, url.searchParams.get("project_module") ? sources.filter((item) => item.project_module === url.searchParams.get("project_module")) : sources);
  const sourceMatch = path.match(/^\/api\/v2\/sources\/([^/]+)(?:\/([^/]+))?$/);
  if (sourceMatch) {
    const [, sourceId, subresource] = sourceMatch;
    const selectedSource = sources.find((item) => item.uuid === sourceId) ?? sources[0];
    if (!subresource) {
      if (request.method === "DELETE") { response.writeHead(204); return response.end(); }
      return json(response, request.method === "PATCH" ? { ...selectedSource, stale_after_hours: 48 } : selectedSource);
    }
    if (subresource === "status") return json(response, { ready_for_execution: true, discovery_complete: true, workflow_run_pending: selectedSource.workflow_run_pending, discovery_signature: selectedSource.discovery_signature, last_executed_discovery_signature: selectedSource.last_executed_discovery_signature, signature_matches_last_execution: false, blockers: [], pending_age_seconds: selectedSource.workflow_run_pending ? 1100 : null });
    if (subresource === "metadata") return json(response, { source: selectedSource, metadata_count: 2, metadata: [{ uuid: "019b37af-d000-7000-8000-000000000001", project_module: selectedSource.project_module, source_identifier: selectedSource.source_identifier, sbid: "59122", metadata_json: { source_identifier: selectedSource.source_identifier, sbid: 59122, ra_string: "10:37:29.1", dec_string: "-26:19:01", vsys: 1390, discovery_flags: { ra_dec_vsys_complete: true }, datasets: [{ dataset_id: "ASKAP-59122.ms", visibility_filename: "ASKAP-59122.ms", filesize: 4831838208, evaluation_file: "evaluation-59122.xml" }] }, created_at: iso(-700_000), updated_at: iso(-600_000) }, { uuid: "019b37af-d000-7000-8000-000000000002", project_module: selectedSource.project_module, source_identifier: selectedSource.source_identifier, sbid: "59131", metadata_json: { source_identifier: selectedSource.source_identifier, sbid: 59131, discovery_flags: { ra_dec_vsys_complete: true }, datasets: [{ dataset_id: "ASKAP-59131.ms", visibility_filename: "ASKAP-59131.ms", filesize: 3908321280 }] }, created_at: iso(-700_000), updated_at: iso(-600_000) }] });
    if (subresource === "executions") return json(response, runs.slice(0, 3));
    if (subresource === "events") return json(response, events.map((event) => ({ ...event, execution_id: null, source_identifier: selectedSource.source_identifier, event_type: event.event_type.replace("execution", "source") })));
  }
  if (path === "/api/v2/jobs" && request.method === "POST") return json(response, { uuid: "019b37af-e000-7000-8000-000000000001", kind: "execution_scheduler_tick", payload: { project_module: "wallaby_hires" }, status: "queued", execution_id: null, phase: null, attempts: 0, max_attempts: 3, next_run_at: iso(), locked_until: null, idempotency_key: "manual", last_error: null, created_at: iso(), updated_at: null }, 202);
  if (path === "/api/v2/executions/prepare" && request.method === "POST") {
    const payload = await readJson(request);
    const identifiers = (payload.sources ?? []).map((source) => source.source_identifier);
    const blocked = identifiers.includes("J100102-270112");
    return json(response, { project_module: payload.project_module ?? "wallaby_hires", valid: !blocked, errors: blocked ? ["Source J100102-270112: Discovery is still in progress for this source (active lease). Wait and retry."] : [], total_datasets: blocked ? 0 : identifiers.length * 2, sources_preview: blocked ? [] : identifiers.map((source_identifier) => ({ source_identifier, sbid_count: 2, dataset_count: 2 })) });
  }
  if (path === "/api/v2/executions" && request.method === "POST") return json(response, { ...runs[0], uuid: "019b37af-4f6c-7d7a-9a73-555555555555", status: "pending", execution_phase: null, control_phase: "created", scheduler_name: null, daliuge_session_id: null, created_at: iso() }, 201);
  if (path === "/api/v2/executions") {
    let items = runs;
    const project = url.searchParams.get("project_module");
    const status = url.searchParams.get("status");
    if (project) items = items.filter((item) => item.project_module === project);
    if (status) items = items.filter((item) => item.status === status);
    return json(response, { items, total: items.length, page: 1, items_per_page: 200 });
  }
  const executionMatch = path.match(/^\/api\/v2\/executions\/([^/]+)(?:\/([^/]+))?$/);
  if (executionMatch) {
    const [, executionId, subresource] = executionMatch;
    const selected = executionId === detailRun.uuid ? detailRun : runs.find((item) => item.uuid === executionId) ?? detailRun;
    if (!subresource) return json(response, request.method === "PATCH" ? { ...selected, status: "cancelled" } : selected);
    if (subresource === "status") return json(response, { uuid: selected.uuid, status: selected.status, execution_phase: selected.execution_phase, control_phase: selected.control_phase, submission_state: selected.submission_state ?? null, scheduler_name: selected.scheduler_name, scheduler_job_id: selected.scheduler_job_id, scheduler_state: selected.scheduler_state, scheduler_raw_state: selected.scheduler_raw_state, scheduler_reason: selected.scheduler_reason, daliuge_session_id: selected.daliuge_session_id, daliuge_state: selected.daliuge_state, output_state: selected.output_state, terminal_outcome: selected.terminal_outcome, failure_class: selected.failure_class, last_error: selected.last_error, retry_count: selected.retry_count, started_at: selected.started_at, completed_at: selected.completed_at, slurm_state: null, dim_state: "RUNNING", last_observation_at: iso(-12_000), duration_seconds: 708 });
    if (subresource === "summary") return json(response, { uuid: selected.uuid, project_module: selected.project_module, archive_name: selected.archive_name, status: selected.status, requested_source_count: selected.sources.length, requested_source_identifiers: selected.sources, scheduler_name: selected.scheduler_name, scheduler_job_id: selected.scheduler_job_id, daliuge_session_id: selected.daliuge_session_id, control_phase: selected.control_phase, scheduler_state: selected.scheduler_state, daliuge_state: selected.daliuge_state, terminal_outcome: selected.terminal_outcome, last_error: selected.last_error });
    if (subresource === "events") return json(response, events);
    if (subresource === "observations") return json(response, observations);
    if (subresource === "artifacts") return json(response, artifacts);
    if (subresource === "ledger-snapshot") return json(response, { uuid: selected.uuid, status: selected.status, execution_phase: selected.execution_phase, scheduler_name: selected.scheduler_name, scheduler_job_id: selected.scheduler_job_id, correlation_id: "corr-demo-01", active_job_id: "019b37af-2000-7000-8000-000000000001", workflow_manifest: selected.workflow_manifest, last_error: selected.last_error, run_record_phases: selected.beampipe_run_record, provenance_summary: { config_version: 3, discovery_signature: selected.discovery_signature, recent_events: events } });
    if (["execute", "retry"].includes(subresource)) return json(response, { status: "accepted", execution_id: selected.uuid, job_id: "019b37af-a000-7000-8000-000000000001", retry_count: selected.retry_count + (subresource === "retry" ? 1 : 0) }, 202);
  }
  if (path === "/api/v2/workers") return json(response, [
    { id: "019b37af-1000-7000-8000-000000000001", instance_name: "worker-rest-01", host: "beampipe-api-0", process_id: 41, role: "worker", pool: "default", capabilities: ["discover", "execute", "dim_poll"], labels: { zone: "local" }, version: "2.0.0", concurrency_limit: 4, status: "active", health: "healthy", active_leases: 2, heartbeat_age_seconds: 3, started_at: iso(-3_600_000), last_heartbeat_at: iso(-3_000), draining_at: null, stopped_at: null },
    { id: "019b37af-1000-7000-8000-000000000002", instance_name: "worker-slurm-01", host: "scheduler-edge", process_id: 9021, role: "scheduler_worker", pool: "slurm", capabilities: ["execute", "slurm_poll"], labels: { site: "setonix" }, version: "2.0.0", concurrency_limit: 8, status: "active", health: "healthy", active_leases: 1, heartbeat_age_seconds: 6, started_at: iso(-7_200_000), last_heartbeat_at: iso(-6_000), draining_at: null, stopped_at: null },
    { id: "019b37af-1000-7000-8000-000000000003", instance_name: "worker-discovery-02", host: "beampipe-api-1", process_id: 55, role: "worker", pool: "default", capabilities: ["discover"], labels: {}, version: "2.0.0", concurrency_limit: 2, status: "active", health: "stale", active_leases: 0, heartbeat_age_seconds: 185, started_at: iso(-7_200_000), last_heartbeat_at: iso(-185_000), draining_at: null, stopped_at: null },
  ]);
  if (path === "/api/v2/workers/pools") return json(response, [{ pool: "default", active_workers: 2, draining_workers: 0, unhealthy_workers: 1, concurrency_limit: 6, active_leases: 2 }, { pool: "slurm", active_workers: 1, draining_workers: 0, unhealthy_workers: 0, concurrency_limit: 8, active_leases: 1 }]);
  if (path === "/api/v2/workers/leases") return json(response, [{ job_id: "019b37af-2000-7000-8000-000000000001", kind: "execute", execution_id: runs[0].uuid, worker_id: "019b37af-1000-7000-8000-000000000001", claim_id: "019b37af-3000-7000-8000-000000000001", pool: "default", required_capability: "execute", attempts: 1, lease_expires_at: iso(60_000), heartbeat_at: iso(-3_000) }, { job_id: "019b37af-2000-7000-8000-000000000002", kind: "slurm_poll", execution_id: runs[1].uuid, worker_id: "019b37af-1000-7000-8000-000000000002", claim_id: "019b37af-3000-7000-8000-000000000002", pool: "slurm", required_capability: "slurm_poll", attempts: 3, lease_expires_at: iso(45_000), heartbeat_at: iso(-4_000) }]);
  if (path === "/api/v2/scheduler/jobs") return json(response, [{ execution_id: runs[1].uuid, project_module: "wallaby_hires", execution_status: "awaiting_scheduler", scheduler_job_id: "784201", scheduler_state: "running", scheduler_raw_state: "RUNNING", scheduler_reason: "Resources", daliuge_session_id: null, remote_session_dir: "/scratch/demo/784201", submitted_at: runs[1].created_at, last_reconciled_at: iso(-12_000) }]);
  if (path === "/api/v2/diagnostics") return json(response, { healthy: false, generated_at: iso(), diagnostics: [{ path: "workers.heartbeat", severity: "warning", code: "workers.stale", message: "1 Beampipe worker heartbeat is stale", hint: "inspect the worker instance and drain it before replacing the process" }, { path: "executions.reconciliation", severity: "warning", code: "reconciliation.operator_attention", message: "1 execution has uncertain external state", hint: "inspect the execution ledger before retrying or resubmitting" }] });
  if (path === "/api/v2/notification-channels" && request.method === "GET") return json(response, notificationChannels);
  if (path === "/api/v2/notification-channels" && request.method === "POST") {
    const payload = await readJson(request);
    const created = { uuid: "019b37af-d100-7000-8000-000000000003", name: payload.name ?? "new-channel", kind: payload.kind ?? "webhook", config: { ...(payload.config ?? {}), url: payload.config?.url ? "https://hooks.example.test/redacted" : undefined, template: payload.config?.template ?? "generic" }, secret_fields: payload.config?.url ? [] : [], configured_fields: Object.keys(payload.config ?? {}), enabled: payload.enabled !== false, created_at: iso(), updated_at: null };
    notificationChannels.push(created);
    return json(response, created, 201);
  }
  const channelMatch = path.match(/^\/api\/v2\/notification-channels\/([^/]+)(?:\/(test))?$/);
  if (channelMatch) {
    const channel = notificationChannels.find((item) => item.uuid === channelMatch[1]) ?? slackChannel;
    if (channelMatch[2] === "test") {
      const delivery = { uuid: "019b37af-d300-7000-8000-000000000099", rule_id: null, channel_id: channel.uuid, status: "sent", payload: { alert: "test", severity: "info", project_module: "test", summary: "Beampipe test notification" }, error: null, created_at: iso() };
      alertDeliveries.unshift(delivery);
      return json(response, { delivery_id: delivery.uuid, status: "sent_or_failed" });
    }
    if (request.method === "DELETE") { response.writeHead(204); return response.end(); }
    if (request.method === "PATCH") {
      const payload = await readJson(request);
      return json(response, { ...channel, name: payload.name ?? channel.name, enabled: payload.enabled ?? channel.enabled, config: { ...channel.config, ...(payload.config ?? {}), url: channel.config.url }, updated_at: iso() });
    }
    return json(response, channel);
  }
  if (path === "/api/v2/alert-rules" && request.method === "GET") return json(response, alertRules);
  if (path === "/api/v2/alert-rules" && request.method === "POST") {
    const payload = await readJson(request);
    const created = { uuid: "019b37af-d200-7000-8000-000000000003", name: payload.name ?? "new-rule", project_module: payload.project_module ?? "wallaby_hires", enabled: payload.enabled !== false, severity: payload.severity ?? "warning", trigger_kind: payload.trigger_kind ?? "execution_terminal", trigger_config: payload.trigger_config ?? {}, channel_ids: payload.channel_ids ?? [slackChannel.uuid], cooldown_minutes: payload.cooldown_minutes ?? 60, last_fired_at: null, created_at: iso(), updated_at: null };
    alertRules.push(created);
    return json(response, created, 201);
  }
  const ruleMatch = path.match(/^\/api\/v2\/alert-rules\/([^/]+)$/);
  if (ruleMatch) {
    const rule = alertRules.find((item) => item.uuid === ruleMatch[1]) ?? alertRule;
    if (request.method === "DELETE") { response.writeHead(204); return response.end(); }
    if (request.method === "PATCH") {
      const payload = await readJson(request);
      return json(response, { ...rule, ...payload, updated_at: iso() });
    }
    return json(response, rule);
  }
  if (path === "/api/v2/alert-deliveries") return json(response, alertDeliveries.slice(0, Number.parseInt(url.searchParams.get("limit") ?? "50", 10)));
  if (path === "/api/v2/metrics") {
    response.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    return response.end(`beampipe_api_requests_total{method="GET",route="/api/v2/overview",status="200"} 1842\nbeampipe_api_requests_total{method="GET",route="/api/v2/executions",status="200"} 1278\nbeampipe_api_requests_total{method="POST",route="/api/v2/sources/discover",status="202"} 122\nbeampipe_api_requests_total{method="GET",route="/api/v2/diagnostics",status="500"} 3\nbeampipe_api_request_duration_seconds_sum{method="GET",route="/api/v2/overview",status="200"} 184.2\nbeampipe_api_request_duration_seconds_count{method="GET",route="/api/v2/overview",status="200"} 1842\nbeampipe_jobs_queued{kind="discover_batch"} 3\nbeampipe_jobs_queued{kind="execute"} 1\nbeampipe_jobs_queued{kind="slurm_poll"} 1\nbeampipe_jobs_queued{kind="dim_poll"} 0\nbeampipe_jobs_oldest_queued_age_seconds{kind="discover_batch"} 48\nbeampipe_jobs_oldest_queued_age_seconds{kind="execute"} 13\nbeampipe_jobs_oldest_queued_age_seconds{kind="slurm_poll"} 6\nbeampipe_reconciliation_risk_executions 1\nbeampipe_execution_retries_total 7\nbeampipe_slurm_ssh_configured 1\n`);
  }
  return json(response, { message: `mock route not found: ${path}` }, 404);
}).listen(mockPort, mockHost, () => console.log(`mock beampipe on ${mockHost}:${mockPort}`));
