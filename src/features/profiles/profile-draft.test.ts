import { describe, expect, it } from "vitest";
import { changeDeploymentKind, createDeploymentProfile, profileFromResponse, validateDeploymentProfile } from "./profile-draft";

describe("deployment profile drafts", () => {
  it("creates a valid local REST profile", () => {
    expect(validateDeploymentProfile(createDeploymentProfile("rest_remote"))).toEqual([]);
  });

  it("defaults a new Slurm profile to the setonix credential slot", () => {
    const profile = createDeploymentProfile("slurm_remote");
    if (profile.deployment.kind !== "slurm_remote") throw new Error("expected Slurm profile");
    expect(profile.deployment.ssh_credential).toBe("setonix");
  });

  it("switches backends without dropping shared translation policy", () => {
    const rest = createDeploymentProfile("rest_remote");
    rest.translation.tm_url = "http://translator:8084";
    const slurm = changeDeploymentKind(rest, "slurm_remote");
    expect(slurm.deployment.kind).toBe("slurm_remote");
    expect(slurm.translation.tm_url).toBe("http://translator:8084");
    expect(slurm.translation.num_islands).toBe(1);
  });

  it("rejects unsafe remote paths and invalid scheduler resources", () => {
    const profile = createDeploymentProfile("slurm_remote");
    if (profile.deployment.kind !== "slurm_remote") throw new Error("expected Slurm profile");
    profile.deployment.login_node = "setonix.example";
    profile.deployment.account = "project";
    profile.deployment.log_dir = "/scratch/project;whoami";
    profile.deployment.resources.nodes = 0;
    profile.deployment.ssh_credential = "../etc";
    expect(validateDeploymentProfile(profile)).toEqual(expect.arrayContaining([
      "Log directory contains unsafe shell characters",
      "Nodes must be at least 1",
      "SSH credential must use 1-50 letters, digits, dots, underscores, or dashes",
    ]));
  });

  it("hydrates nested Slurm defaults from an API response", () => {
    const source = createDeploymentProfile("slurm_remote");
    if (source.deployment.kind !== "slurm_remote") throw new Error("expected Slurm profile");
    source.deployment.login_node = "setonix";
    source.deployment.account = "p1";
    source.deployment.home_dir = "/h";
    source.deployment.log_dir = "/l";
    source.deployment.dlg_root = "/d";
    source.deployment.resources = { nodes: 2 };
    source.deployment.manager_topology = { co_host_dim: false };
    const draft = profileFromResponse({
      ...source,
      uuid: "profile-1",
      name: "setonix",
      description: null,
      project_module: "wallaby_hires",
      is_default: true,
      max_concurrent_executions: 4,
      revision: 2,
      spec_sha256: "abc",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: null,
    });
    expect(draft.deployment.kind).toBe("slurm_remote");
    if (draft.deployment.kind === "slurm_remote") {
      expect(draft.deployment.resources.nodes).toBe(2);
      expect(draft.deployment.resources.tasks).toBe(1);
      expect(draft.deployment.manager_topology.islands).toBe(1);
    }
  });
});
