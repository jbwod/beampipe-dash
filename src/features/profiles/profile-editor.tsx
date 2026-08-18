"use client";

import { Tabs } from "@base-ui/react/tabs";
import type { DeploymentProfile, RestRemoteDeployment, SlurmRemoteDeployment } from "@/shared/types/beampipe";
import { changeDeploymentKind } from "./profile-draft";
import { ProfileGrid, ProfileNumberField, ProfileSection, ProfileSelect, ProfileTextField, ProfileToggle } from "./profile-fields";

const tabClass = "h-9 shrink-0 border-r border-[var(--bp-border-soft)] px-3 text-[10px] uppercase text-[var(--bp-muted)] hover:text-[var(--bp-text)] data-active:bg-[var(--bp-panel-soft)] data-active:text-[var(--bp-cyan)]";
const panelClass = "p-4 outline-none [[hidden]]:hidden";

export function DeploymentProfileEditor({ profile, onChange }: { profile: DeploymentProfile; onChange: (profile: DeploymentProfile) => void }) {
  const set = <K extends keyof DeploymentProfile>(key: K, value: DeploymentProfile[K]) => onChange({ ...profile, [key]: value });
  const setTranslation = <K extends keyof DeploymentProfile["translation"]>(key: K, value: DeploymentProfile["translation"][K]) => set("translation", { ...profile.translation, [key]: value });
  const kind = profile.deployment.kind;

  return (
    <Tabs.Root defaultValue="general" key={kind}>
      <Tabs.List className="flex overflow-x-auto border-b border-[var(--bp-border)] bg-black">
        <Tabs.Tab className={tabClass} value="general">General</Tabs.Tab>
        <Tabs.Tab className={tabClass} value="translation">Translation</Tabs.Tab>
        <Tabs.Tab className={tabClass} value="backend">{kind === "rest_remote" ? "REST endpoint" : "Slurm connection"}</Tabs.Tab>
        {kind === "slurm_remote" ? <Tabs.Tab className={tabClass} value="resources">Resources</Tabs.Tab> : null}
        {kind === "slurm_remote" ? <Tabs.Tab className={tabClass} value="runtime">Runtime</Tabs.Tab> : null}
      </Tabs.List>

      <Tabs.Panel className={panelClass} value="general">
        <ProfileSection title="Profile identity"><ProfileGrid><ProfileTextField label="Name" onChange={(value) => set("name", normalizeName(value))} value={profile.name} /><ProfileTextField label="Project" onChange={(value) => set("project_module", value || null)} placeholder="global when blank" value={profile.project_module} /><ProfileTextField label="Description" onChange={(value) => set("description", value || null)} value={profile.description} /><ProfileNumberField label="Concurrent execution limit" min={1} onChange={(value) => set("max_concurrent_executions", value)} value={profile.max_concurrent_executions} /></ProfileGrid><div className="mt-3"><ProfileToggle checked={profile.is_default} label="Default profile for this scope" onChange={(value) => set("is_default", value)} /></div></ProfileSection>
        <ProfileSection title="Execution backend"><div className="grid grid-cols-2 border border-[var(--bp-border)]"><BackendChoice active={kind === "rest_remote"} detail="DIM deployment API" label="REST remote" onClick={() => onChange(changeDeploymentKind(profile, "rest_remote"))} /><BackendChoice active={kind === "slurm_remote"} detail="SSH scheduler submission" label="Slurm remote" onClick={() => onChange(changeDeploymentKind(profile, "slurm_remote"))} /></div></ProfileSection>
      </Tabs.Panel>

      <Tabs.Panel className={panelClass} value="translation">
        <ProfileSection detail="Logical graph to physical graph translation" title="DALiuGE translator"><ProfileGrid columns={3}><ProfileSelect label="Algorithm" onChange={(value) => setTranslation("algo", value as "metis" | "mysarkar")} options={[{ value: "metis", label: "METIS" }, { value: "mysarkar", label: "MySarkar" }]} value={profile.translation.algo} /><ProfileNumberField label="Partitions" min={1} onChange={(value) => setTranslation("num_par", value ?? 1)} value={profile.translation.num_par} /><ProfileNumberField label="Islands" min={0} onChange={(value) => setTranslation("num_islands", value ?? 0)} value={profile.translation.num_islands} /></ProfileGrid><div className="mt-3"><ProfileTextField label="Translator manager URL" onChange={(value) => setTranslation("tm_url", value || null)} placeholder="http://translator:8084" type="url" value={profile.translation.tm_url} /></div></ProfileSection>
      </Tabs.Panel>

      <Tabs.Panel className={panelClass} value="backend">
        {profile.deployment.kind === "rest_remote" ? <RestEditor deployment={profile.deployment} onChange={(deployment) => set("deployment", deployment)} /> : <SlurmConnectionEditor deployment={profile.deployment} onChange={(deployment) => set("deployment", deployment)} />}
      </Tabs.Panel>

      {profile.deployment.kind === "slurm_remote" ? <Tabs.Panel className={panelClass} value="resources"><SlurmResourceEditor deployment={profile.deployment} onChange={(deployment) => set("deployment", deployment)} /></Tabs.Panel> : null}
      {profile.deployment.kind === "slurm_remote" ? <Tabs.Panel className={panelClass} value="runtime"><SlurmRuntimeEditor deployment={profile.deployment} onChange={(deployment) => set("deployment", deployment)} /></Tabs.Panel> : null}
    </Tabs.Root>
  );
}

function BackendChoice({ active, detail, label, onClick }: { active: boolean; detail: string; label: string; onClick: () => void }) {
  return <button className={`min-w-0 p-3 text-left first:border-r first:border-[var(--bp-border)] ${active ? "bg-[var(--bp-cyan)]/10 text-[var(--bp-cyan)]" : "text-[var(--bp-muted)] hover:bg-[var(--bp-panel-soft)]"}`} onClick={onClick} type="button"><span className="block text-xs uppercase">{active ? "[x]" : "[ ]"} {label}</span><span className="mt-1 block truncate text-[10px] text-[var(--bp-subtle)]">{detail}</span></button>;
}

function RestEditor({ deployment, onChange }: { deployment: RestRemoteDeployment; onChange: (value: RestRemoteDeployment) => void }) {
  const set = <K extends keyof RestRemoteDeployment>(key: K, value: RestRemoteDeployment[K]) => onChange({ ...deployment, [key]: value });
  return <><ProfileSection title="Deployment manager"><ProfileGrid><ProfileTextField label="Deploy host" onChange={(value) => set("deploy_host", value)} placeholder="dim.example.org" value={deployment.deploy_host} /><ProfileNumberField label="Deploy port" max={65_535} min={1} onChange={(value) => set("deploy_port", value)} value={deployment.deploy_port} /><ProfileTextField label="DIM host seen by translator" onChange={(value) => set("dim_host_for_tm", value || null)} placeholder="defaults to deploy host" value={deployment.dim_host_for_tm} /><ProfileNumberField label="DIM port seen by translator" max={65_535} min={1} onChange={(value) => set("dim_port_for_tm", value)} value={deployment.dim_port_for_tm} /></ProfileGrid></ProfileSection><ProfileSection title="Transport"><div className="grid gap-3 sm:grid-cols-2"><ProfileToggle checked={deployment.use_https} label="Use HTTPS" onChange={(value) => set("use_https", value)} /><ProfileToggle checked={deployment.verify_ssl} label="Verify TLS certificate" onChange={(value) => set("verify_ssl", value)} /></div></ProfileSection></>;
}

function SlurmConnectionEditor({ deployment, onChange }: { deployment: SlurmRemoteDeployment; onChange: (value: SlurmRemoteDeployment) => void }) {
  const set = <K extends keyof SlurmRemoteDeployment>(key: K, value: SlurmRemoteDeployment[K]) => onChange({ ...deployment, [key]: value });
  const slot = deployment.ssh_credential?.trim() || "<slot>";
  return (
    <>
      <ProfileSection title="SSH target">
        <ProfileGrid columns={4}>
          <ProfileTextField label="Login node" onChange={(value) => set("login_node", value)} placeholder="setonix.pawsey.org.au" value={deployment.login_node} />
          <ProfileNumberField label="SSH port" max={65_535} min={1} onChange={(value) => set("ssh_port", value ?? 22)} value={deployment.ssh_port} />
          <ProfileTextField label="Remote user" onChange={(value) => set("remote_user", value || null)} value={deployment.remote_user} />
          <ProfileTextField label="Facility" onChange={(value) => set("facility", value)} value={deployment.facility} />
        </ProfileGrid>
      </ProfileSection>
      <ProfileSection
        detail="Names the Core credential directory only. Dash never accepts the private key or passphrase. Create files with `beampipe slurm credentials init --slot setonix`. Passphrase-locked keys use a 0600 passphrase file beside private_key."
        title="SSH credential slot"
      >
        <ProfileTextField
          label="Credential slot"
          onChange={(value) => set("ssh_credential", value || null)}
          placeholder="setonix"
          value={deployment.ssh_credential}
        />
        <p className="mt-3 font-mono text-[10px] leading-5 text-[var(--bp-muted)]">
          $BEAMPIPE_SSH_CREDENTIALS_DIR/{slot}/private_key
          <br />
          $BEAMPIPE_SSH_CREDENTIALS_DIR/{slot}/passphrase
          <br />
          $BEAMPIPE_SSH_CREDENTIALS_DIR/{slot}/known_hosts
        </p>
      </ProfileSection>
      <ProfileSection title="Remote workspace">
        <ProfileGrid>
          <ProfileTextField label="Slurm account" onChange={(value) => set("account", value)} value={deployment.account} />
          <ProfileTextField label="Home directory" onChange={(value) => set("home_dir", value)} value={deployment.home_dir} />
          <ProfileTextField label="DALiuGE root" onChange={(value) => set("dlg_root", value)} value={deployment.dlg_root} />
          <ProfileTextField label="Log directory" onChange={(value) => set("log_dir", value)} value={deployment.log_dir} />
        </ProfileGrid>
      </ProfileSection>
    </>
  );
}

function SlurmResourceEditor({ deployment, onChange }: { deployment: SlurmRemoteDeployment; onChange: (value: SlurmRemoteDeployment) => void }) {
  const set = <K extends keyof SlurmRemoteDeployment>(key: K, value: SlurmRemoteDeployment[K]) => onChange({ ...deployment, [key]: value });
  const setResource = <K extends keyof SlurmRemoteDeployment["resources"]>(key: K, value: SlurmRemoteDeployment["resources"][K]) => set("resources", { ...deployment.resources, [key]: value });
  const setTopology = <K extends keyof SlurmRemoteDeployment["manager_topology"]>(key: K, value: SlurmRemoteDeployment["manager_topology"][K]) => set("manager_topology", { ...deployment.manager_topology, [key]: value });
  return <><ProfileSection title="Slurm resources"><ProfileGrid columns={4}><ProfileTextField label="Partition" onChange={(value) => setResource("partition", value || null)} value={deployment.resources.partition} /><ProfileNumberField label="Nodes" min={1} onChange={(value) => setResource("nodes", value)} value={deployment.resources.nodes} /><ProfileNumberField label="Tasks" min={1} onChange={(value) => setResource("tasks", value)} value={deployment.resources.tasks} /><ProfileNumberField label="CPUs per task" min={1} onChange={(value) => setResource("cpus_per_task", value)} value={deployment.resources.cpus_per_task} /><ProfileTextField label="Memory" onChange={(value) => setResource("memory", value || null)} placeholder="64G" value={deployment.resources.memory} /><ProfileNumberField label="Wall time (minutes)" min={1} onChange={(value) => setResource("wall_time_minutes", value)} value={deployment.resources.wall_time_minutes} /><ProfileTextField label="Constraint" onChange={(value) => setResource("constraint", value || null)} value={deployment.resources.constraint} /><ProfileTextField label="Quality of service" onChange={(value) => setResource("quality_of_service", value || null)} value={deployment.resources.quality_of_service} /></ProfileGrid></ProfileSection><ProfileSection title="DALiuGE manager topology"><ProfileGrid columns={3}><ProfileNumberField label="Manager nodes" min={1} onChange={(value) => setTopology("nodes", value)} value={deployment.manager_topology.nodes} /><ProfileNumberField label="Islands" min={1} onChange={(value) => setTopology("islands", value)} value={deployment.manager_topology.islands} /><ProfileToggle checked={deployment.manager_topology.co_host_dim} label="Co-host DIM" onChange={(value) => setTopology("co_host_dim", value)} /></ProfileGrid></ProfileSection><ProfileSection detail="Compatibility defaults used when explicit resource fields are absent" title="Legacy scheduler defaults"><ProfileGrid columns={4}><ProfileNumberField label="Job duration (minutes)" min={1} onChange={(value) => set("job_duration_minutes", value ?? 30)} value={deployment.job_duration_minutes} /><ProfileNumberField label="Number of nodes" min={1} onChange={(value) => set("num_nodes", value ?? 1)} value={deployment.num_nodes} /><ProfileNumberField label="Number of islands" min={1} onChange={(value) => set("num_islands", value ?? 1)} value={deployment.num_islands} /><ProfileNumberField label="Maximum threads" min={0} onChange={(value) => set("max_threads", value ?? 0)} value={deployment.max_threads} /></ProfileGrid></ProfileSection></>;
}

function SlurmRuntimeEditor({ deployment, onChange }: { deployment: SlurmRemoteDeployment; onChange: (value: SlurmRemoteDeployment) => void }) {
  const set = <K extends keyof SlurmRemoteDeployment>(key: K, value: SlurmRemoteDeployment[K]) => onChange({ ...deployment, [key]: value });
  return <><ProfileSection title="Remote runtime"><ProfileGrid><ProfileTextField label="Execution prefix" onChange={(value) => set("exec_prefix", value)} value={deployment.exec_prefix} /><ProfileTextField label="Container runtime" onChange={(value) => set("container_runtime", value || null)} value={deployment.container_runtime} /><ProfileTextField label="Virtual environment command" onChange={(value) => set("venv", value || null)} value={deployment.venv} /><ProfileNumberField label="Verbose level" min={0} onChange={(value) => set("verbose_level", value ?? 1)} value={deployment.verbose_level} /></ProfileGrid><div className="mt-3 grid gap-3 md:grid-cols-2"><ProfileTextField label="Modules command" multiline onChange={(value) => set("modules", value || null)} rows={4} value={deployment.modules} /><ProfileTextField label="Environment setup" multiline onChange={(value) => set("environment_setup", value || null)} rows={4} value={deployment.environment_setup} /></div></ProfileSection><ProfileSection title="DALiuGE launch flags"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><ProfileToggle checked={deployment.all_nics} label="All NICs" onChange={(value) => set("all_nics", value)} /><ProfileToggle checked={deployment.zerorun} label="Zero run" onChange={(value) => set("zerorun", value)} /><ProfileToggle checked={deployment.sleepncopy} label="Sleep and copy" onChange={(value) => set("sleepncopy", value)} /><ProfileToggle checked={deployment.check_with_session} label="Check with session" onChange={(value) => set("check_with_session", value)} /><ProfileToggle checked={deployment.verify_ssl} label="Verify TLS" onChange={(value) => set("verify_ssl", value)} /></div></ProfileSection><ProfileSection title="Slurm template"><ProfileTextField label="Template" multiline onChange={(value) => set("slurm_template", value || null)} placeholder="Optional sbatch template override" rows={10} value={deployment.slurm_template} /></ProfileSection></>;
}

function normalizeName(value: string) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 50);
}
