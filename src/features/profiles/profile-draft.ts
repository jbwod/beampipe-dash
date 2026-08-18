import type {
  DeploymentProfile,
  DeploymentProfileResponse,
  RestRemoteDeployment,
  SlurmRemoteDeployment,
} from "@/shared/types/beampipe";

export type DeploymentKind = DeploymentProfile["deployment"]["kind"];

export function createDeploymentProfile(kind: DeploymentKind = "rest_remote"): DeploymentProfile {
  return {
    name: kind === "rest_remote" ? "rest-local" : "slurm-remote",
    description: "",
    project_module: null,
    is_default: false,
    max_concurrent_executions: null,
    translation: {
      algo: "metis",
      num_par: 1,
      num_islands: kind === "slurm_remote" ? 1 : 0,
      tm_url: null,
    },
    deployment: kind === "rest_remote" ? createRestDeployment() : createSlurmDeployment(),
  };
}

export function profileFromResponse(profile: DeploymentProfileResponse): DeploymentProfile {
  const kind = profile.deployment.kind;
  const defaults = createDeploymentProfile(kind);
  return {
    name: profile.name,
    description: profile.description ?? "",
    project_module: profile.project_module,
    is_default: profile.is_default,
    max_concurrent_executions: profile.max_concurrent_executions,
    translation: { ...defaults.translation, ...profile.translation },
    deployment: kind === "rest_remote"
      ? { ...defaults.deployment as RestRemoteDeployment, ...profile.deployment }
      : {
          ...defaults.deployment as SlurmRemoteDeployment,
          ...profile.deployment,
          resources: { ...(defaults.deployment as SlurmRemoteDeployment).resources, ...profile.deployment.resources },
          manager_topology: { ...(defaults.deployment as SlurmRemoteDeployment).manager_topology, ...profile.deployment.manager_topology },
        },
  } as DeploymentProfile;
}

export function changeDeploymentKind(profile: DeploymentProfile, kind: DeploymentKind): DeploymentProfile {
  if (profile.deployment.kind === kind) return profile;
  const next = createDeploymentProfile(kind);
  return {
    ...profile,
    translation: {
      ...profile.translation,
      num_islands: kind === "slurm_remote" && profile.translation.num_islands === 0 ? 1 : profile.translation.num_islands,
    },
    deployment: next.deployment,
  };
}

export function validateDeploymentProfile(profile: DeploymentProfile) {
  const errors: string[] = [];
  if (!/^[A-Za-z0-9._-]{1,50}$/.test(profile.name)) errors.push("Name must use 1-50 letters, digits, dots, underscores, or dashes");
  if (profile.translation.num_par < 1) errors.push("Translation partitions must be at least 1");
  if (profile.translation.num_islands < 0) errors.push("Translation islands cannot be negative");
  if (profile.max_concurrent_executions != null && profile.max_concurrent_executions < 1) errors.push("Concurrency limit must be at least 1");
  if (profile.translation.tm_url && !isHttpUrl(profile.translation.tm_url)) errors.push("Translator URL must be an HTTP or HTTPS URL");

  if (profile.deployment.kind === "rest_remote") {
    if (!profile.deployment.deploy_host.trim()) errors.push("REST deploy host is required");
    validatePort(profile.deployment.deploy_port, "REST deploy port", errors);
    validatePort(profile.deployment.dim_port_for_tm, "DIM port for translator", errors);
  } else {
    const deployment = profile.deployment;
    if (!deployment.login_node.trim()) errors.push("Slurm login node is required");
    if (!deployment.account.trim()) errors.push("Slurm account is required");
    if (deployment.ssh_credential && !/^[A-Za-z0-9._-]{1,50}$/.test(deployment.ssh_credential)) {
      errors.push("SSH credential must use 1-50 letters, digits, dots, underscores, or dashes");
    }
    validatePort(deployment.ssh_port, "SSH port", errors);
    for (const [label, path] of [["Home directory", deployment.home_dir], ["Log directory", deployment.log_dir], ["DALiuGE root", deployment.dlg_root]] as const) {
      if (!path.startsWith("/")) errors.push(`${label} must be an absolute remote path`);
      if (/[\0\r\n;&|`$<>]/.test(path)) errors.push(`${label} contains unsafe shell characters`);
    }
    for (const [label, value] of [
      ["Nodes", deployment.resources.nodes ?? deployment.num_nodes],
      ["Islands", deployment.manager_topology.islands ?? deployment.num_islands],
      ["Wall time", deployment.resources.wall_time_minutes ?? deployment.job_duration_minutes],
      ["Tasks", deployment.resources.tasks],
      ["CPUs per task", deployment.resources.cpus_per_task],
      ["Manager nodes", deployment.manager_topology.nodes],
    ] as const) {
      if (value != null && value < 1) errors.push(`${label} must be at least 1`);
    }
    for (const [label, value] of [["Partition", deployment.resources.partition], ["Memory", deployment.resources.memory], ["Constraint", deployment.resources.constraint], ["Quality of service", deployment.resources.quality_of_service]] as const) {
      if (value != null && !value.trim()) errors.push(`${label} cannot be blank when set`);
    }
  }
  return errors;
}

function createRestDeployment(): RestRemoteDeployment {
  return {
    kind: "rest_remote",
    dim_host_for_tm: null,
    dim_port_for_tm: 8001,
    deploy_host: "127.0.0.1",
    deploy_port: 8001,
    use_https: false,
    verify_ssl: true,
  };
}

function createSlurmDeployment(): SlurmRemoteDeployment {
  return {
    kind: "slurm_remote",
    login_node: "",
    ssh_port: 22,
    remote_user: null,
    ssh_credential: null,
    account: "",
    home_dir: "/scratch/project",
    log_dir: "/scratch/project/beampipe/logs",
    exec_prefix: "srun -l",
    dlg_root: "/scratch/project/beampipe/dlg",
    venv: null,
    modules: null,
    facility: "",
    job_duration_minutes: 30,
    num_nodes: 1,
    num_islands: 1,
    verbose_level: 1,
    max_threads: 0,
    all_nics: false,
    zerorun: false,
    sleepncopy: false,
    check_with_session: false,
    verify_ssl: true,
    slurm_template: null,
    resources: {
      partition: null,
      nodes: 1,
      tasks: 1,
      cpus_per_task: 1,
      memory: null,
      wall_time_minutes: 30,
      constraint: null,
      quality_of_service: null,
    },
    manager_topology: { nodes: 1, islands: 1, co_host_dim: false },
    container_runtime: null,
    environment_setup: null,
  };
}

function validatePort(value: number | null | undefined, label: string, errors: string[]) {
  if (value != null && (!Number.isInteger(value) || value < 1 || value > 65_535)) errors.push(`${label} must be between 1 and 65535`);
}

function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
