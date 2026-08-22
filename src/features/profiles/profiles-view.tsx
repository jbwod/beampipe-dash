"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, PlugZap, Save, ServerCog, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionDialog } from "@/shared/components/action-dialog";
import { EmptyRows, LoadingRows, QueryFailure, SectionHeading } from "@/shared/components/operator-ui";
import { StatusBadge } from "@/shared/components/status-badge";
import { dashboardFetch } from "@/shared/lib/http";
import { useUnsavedNavigationGuard } from "@/shared/hooks/use-unsaved-navigation-guard";
import { metricValue, parsePrometheus } from "@/shared/lib/prometheus";
import { formatAge, formatDateTime, shortId } from "@/shared/lib/time";
import type { DaliugeInspectResponse, DeploymentProfile, DeploymentProfileResponse, SchedulerStatusResponse } from "@/shared/types/beampipe";
import { useCurrentUser, useDiagnostics, useMetrics } from "@/features/monitoring/queries";
import { createDeploymentProfile, profileFromResponse, validateDeploymentProfile } from "./profile-draft";
import { DeploymentProfileEditor } from "./profile-editor";
import { useDeploymentProfiles } from "./queries";

type ConnectionResult = { kind: "rest_remote"; data: { inspect: DaliugeInspectResponse; sessions: unknown } } | { kind: "slurm_remote"; data: SchedulerStatusResponse };

export function ProfilesView() {
  const profiles = useDeploymentProfiles();
  if (profiles.isPending) return <div className="p-4 sm:p-6"><div className="border border-[var(--bp-border)]"><LoadingRows rows={7} /></div></div>;
  if (profiles.isError) return <div className="p-4 sm:p-6"><QueryFailure message="Deployment profiles could not be loaded" retry={() => profiles.refetch()} /></div>;
  return <ProfileManager profiles={profiles.data} />;
}

function ProfileManager({ profiles }: { profiles: DeploymentProfileResponse[] }) {
  const first = profiles[0] ?? null;
  const initial = first ? profileFromResponse(first) : createDeploymentProfile();
  const [selectedId, setSelectedId] = useState<string | null>(first?.uuid ?? null);
  const [draft, setDraft] = useState<DeploymentProfile>(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [savedProfile, setSavedProfile] = useState<DeploymentProfileResponse | null>(first);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const metrics = useMetrics();
  const diagnostics = useDiagnostics();
  const dirty = JSON.stringify(draft) !== baseline;
  const errors = useMemo(() => validateDeploymentProfile(draft), [draft]);
  const selected = profiles.find((profile) => profile.uuid === selectedId) ?? null;
  const persisted = savedProfile?.uuid === selectedId ? savedProfile : selected;
  const isSuperuser = Boolean(currentUser.data?.is_superuser);
  const confirmNavigation = useUnsavedNavigationGuard(dirty, "Discard unsaved deployment profile changes?");

  const save = useMutation({
    mutationFn: () => dashboardFetch<DeploymentProfileResponse>(selectedId ? `/api/beampipe/deployment-profiles/${selectedId}` : "/api/beampipe/deployment-profiles", {
      method: selectedId ? "PATCH" : "POST",
      body: JSON.stringify(draft),
    }),
    onSuccess: async (profile) => {
      const next = profileFromResponse(profile);
      setSelectedId(profile.uuid);
      setSavedProfile(profile);
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setResult(null);
      await queryClient.invalidateQueries({ queryKey: ["deployment-profiles"] });
    },
  });

  const remove = useMutation({
    mutationFn: () => dashboardFetch<void>(`/api/beampipe/deployment-profiles/${selectedId}`, { method: "DELETE" }),
    onSuccess: async () => {
      const next = profiles.find((profile) => profile.uuid !== selectedId) ?? null;
      const nextDraft = next ? profileFromResponse(next) : createDeploymentProfile();
      setSelectedId(next?.uuid ?? null);
      setSavedProfile(next);
      setDraft(nextDraft);
      setBaseline(JSON.stringify(nextDraft));
      setDeleteOpen(false);
      setResult(null);
      await queryClient.invalidateQueries({ queryKey: ["deployment-profiles"] });
    },
  });

  const check = useMutation({
    mutationFn: async (): Promise<ConnectionResult> => {
      if (draft.deployment.kind === "slurm_remote") {
        return { kind: "slurm_remote", data: await dashboardFetch<SchedulerStatusResponse>(`/api/beampipe/scheduler/status?profile=${encodeURIComponent(draft.name)}`) };
      }
      const profile = encodeURIComponent(draft.name);
      const [inspect, sessions] = await Promise.all([
        dashboardFetch<DaliugeInspectResponse>(`/api/beampipe/daliuge/inspect?profile=${profile}`),
        dashboardFetch<unknown>(`/api/beampipe/daliuge/sessions?profile=${profile}`),
      ]);
      return { kind: "rest_remote", data: { inspect, sessions } };
    },
    onSuccess: setResult,
  });

  const select = (profile: DeploymentProfileResponse) => {
    if (!confirmNavigation()) return;
    const next = profileFromResponse(profile);
    setSelectedId(profile.uuid);
    setSavedProfile(profile);
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setResult(null);
  };

  const startNew = (kind: "rest_remote" | "slurm_remote") => {
    if (!confirmNavigation()) return;
    const next = createDeploymentProfile(kind);
    setSelectedId(null);
    setSavedProfile(null);
    setDraft(next);
    setBaseline("");
    setResult(null);
  };

  const duplicate = () => {
    const next = { ...structuredClone(draft), name: `${draft.name}-copy`.slice(0, 50), is_default: false };
    setSelectedId(null);
    setSavedProfile(null);
    setDraft(next);
    setBaseline("");
    setResult(null);
  };

  const canSave = isSuperuser && errors.length === 0 && !save.isPending && (!selectedId || dirty);
  const canCheck = Boolean(selectedId) && !dirty && !check.isPending;
  const sshSamples = parsePrometheus(metrics.data ?? "");
  const sshConfigured = metricValue(sshSamples, "beampipe_slurm_ssh_configured") > 0;
  const sshDiagnostics = diagnostics.data?.diagnostics.filter((item) => `${item.path ?? ""} ${item.code ?? ""}`.match(/ssh|known.host|credential/i)) ?? [];

  return (
    <div className="p-4 sm:p-6">
      <div className="grid min-w-0 border border-[var(--bp-border)] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-[var(--bp-border)] bg-[var(--bp-panel)] lg:border-r lg:border-b-0">
          <SectionHeading action={<button aria-label="New REST profile" className="grid size-7 place-items-center border border-[var(--bp-border)] text-[var(--bp-cyan)]" onClick={() => startNew("rest_remote")} title="New REST profile" type="button"><Plus className="size-3.5" /></button>} detail={`${profiles.length} configured`} title="Profiles" />
          <div className="max-h-72 divide-y divide-[var(--bp-border-soft)] overflow-y-auto lg:max-h-[calc(100dvh-300px)] lg:min-h-[620px]">
            {profiles.length ? profiles.map((profile) => <button className={`block w-full min-w-0 px-3 py-3 text-left hover:bg-[var(--bp-panel-soft)] ${profile.uuid === selectedId ? "border-l-2 border-[var(--bp-cyan)] bg-black" : "border-l-2 border-transparent"}`} key={profile.uuid} onClick={() => select(profile)} type="button"><div className="mb-2 flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-xs text-[var(--bp-highlight)]">{profile.name}</span>{profile.is_default ? <span className="text-[9px] uppercase text-[var(--bp-green)]">default</span> : null}</div><div className="flex items-center justify-between gap-2"><StatusBadge status={profile.deployment.kind} /><span className="truncate text-[10px] text-[var(--bp-subtle)]">{profile.project_module ?? "global"} / r{profile.revision}</span></div></button>) : <EmptyRows message="no deployment profiles" />}
          </div>
          <div className="grid grid-cols-2 border-t border-[var(--bp-border)]"><button className="h-9 border-r border-[var(--bp-border)] text-[10px] uppercase text-[var(--bp-cyan)]" onClick={() => startNew("rest_remote")} type="button">+ REST</button><button className="h-9 text-[10px] uppercase text-[var(--bp-cyan)]" onClick={() => startNew("slurm_remote")} type="button">+ Slurm</button></div>
        </aside>

        <main className="min-w-0 bg-black">
          <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-[var(--bp-border)] px-3 py-2">
            <div className="mr-auto min-w-0"><div className="flex items-center gap-2"><ServerCog className="size-3.5 text-[var(--bp-cyan)]" /><h2 className="truncate text-xs font-semibold">{draft.name || "new profile"}</h2><StatusBadge status={draft.deployment.kind} /></div><p className="mt-1 truncate text-[10px] text-[var(--bp-subtle)]">{persisted ? `revision ${persisted.revision} / ${shortId(persisted.spec_sha256, 14)} / ${formatAge(persisted.updated_at ?? persisted.created_at)}` : "unsaved profile"}</p></div>
            <button aria-label="Duplicate profile" className="grid size-8 place-items-center border border-[var(--bp-border)] text-[var(--bp-muted)] hover:text-[var(--bp-cyan)]" onClick={duplicate} title="Duplicate profile" type="button"><Copy className="size-3.5" /></button>
            {selectedId ? <button aria-label="Delete profile" className="grid size-8 place-items-center border border-[var(--bp-red)]/50 text-[var(--bp-red)]" disabled={!isSuperuser} onClick={() => setDeleteOpen(true)} title="Delete profile" type="button"><Trash2 className="size-3.5" /></button> : null}
            <button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-cyan)]/60 px-2 text-[10px] uppercase text-[var(--bp-cyan)] disabled:cursor-not-allowed disabled:opacity-40" disabled={!canCheck} onClick={() => check.mutate()} title={dirty ? "Save changes before checking connectivity" : "Check configured backend"} type="button"><PlugZap className="size-3" />{check.isPending ? "Checking" : "Test"}</button>
            <button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-green)]/60 px-2 text-[10px] uppercase text-[var(--bp-green)] disabled:cursor-not-allowed disabled:opacity-40" disabled={!canSave} onClick={() => save.mutate()} title={isSuperuser ? "Save deployment profile revision" : "Superuser access required"} type="button"><Save className="size-3" />{save.isPending ? "Saving" : selectedId ? "Save revision" : "Create"}</button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--bp-border)] px-3 py-2 text-[10px] uppercase"><StatusBadge status={errors.length ? "error" : "valid"} /><span className="text-[var(--bp-subtle)]">profile contract</span>{dirty ? <span className="ml-auto text-[var(--bp-amber)]">~ unsaved changes</span> : <span className="ml-auto text-[var(--bp-green)]">+ stored revision</span>}</div>
          {errors.length ? <div className="border-b border-[var(--bp-border)] px-3 py-2 text-[10px] leading-5 text-[var(--bp-red)]">{errors.map((error) => <p key={error}>! {error}</p>)}</div> : null}
          {save.isError ? <ErrorStrip message={save.error.message} /> : null}
          {remove.isError ? <ErrorStrip message={remove.error.message} /> : null}
          {check.isError ? <ErrorStrip message={check.error.message} /> : null}

          <DeploymentProfileEditor key={`${selectedId ?? "new"}:${draft.deployment.kind}`} onChange={setDraft} profile={draft} />

          {draft.deployment.kind === "slurm_remote" ? <SshRuntimePanel configured={metrics.isPending ? null : sshConfigured} diagnostics={sshDiagnostics} /> : null}
          {result ? <ConnectionPanel result={result} /> : null}
        </main>
      </div>

      <ActionDialog description={`Remove profile '${draft.name}'. Existing executions retain their pinned profile snapshot.`} onOpenChange={setDeleteOpen} open={deleteOpen} title="Delete deployment profile"><div className="flex justify-end gap-2"><button className="h-8 border border-[var(--bp-border)] px-3 text-[10px] uppercase text-[var(--bp-muted)]" onClick={() => setDeleteOpen(false)} type="button">Back</button><button className="h-8 border border-[var(--bp-red)] px-3 text-[10px] uppercase text-[var(--bp-red)] disabled:opacity-40" disabled={remove.isPending} onClick={() => remove.mutate()} type="button">{remove.isPending ? "Deleting" : "Delete profile"}</button></div></ActionDialog>
    </div>
  );
}

function SshRuntimePanel({ configured, diagnostics }: { configured: boolean | null; diagnostics: Array<{ message: string; severity: string }> }) {
  return <section className="border-t border-[var(--bp-border)]"><SectionHeading detail="Core resolves private_key, optional passphrase, and known_hosts from the credential slot. Dash never stores key material." title="SSH key runtime" /><div className="grid divide-y divide-[var(--bp-border-soft)] sm:grid-cols-3 sm:divide-x sm:divide-y-0"><RuntimeCheck icon={<KeyRound className="size-4" />} label="Private key" status={configured == null ? "checking" : configured ? "configured" : "not_configured"} value="slot private_key + optional passphrase" /><RuntimeCheck icon={<ShieldCheck className="size-4" />} label="Host verification" status={diagnostics.length ? diagnostics[0].severity : "profile_managed"} value={diagnostics[0]?.message ?? "validated on connection"} /><RuntimeCheck icon={<ServerCog className="size-4" />} label="Credential check" status={configured && !diagnostics.length ? "ready" : "pending"} value="beampipe security check" /></div></section>;
}

function RuntimeCheck({ icon, label, status, value }: { icon: React.ReactNode; label: string; status: string; value: string }) {
  return <div className="min-w-0 p-3"><div className="mb-2 flex items-center gap-2 text-[var(--bp-cyan)]">{icon}<span className="text-[10px] uppercase text-[var(--bp-subtle)]">{label}</span><StatusBadge className="ml-auto" status={status} /></div><p className="truncate text-[10px] text-[var(--bp-muted)]" title={value}>{value}</p></div>;
}

function ConnectionPanel({ result }: { result: ConnectionResult }) {
  return <section className="border-t border-[var(--bp-border)]"><SectionHeading detail={`checked ${formatDateTime(new Date().toISOString())}`} title="Connectivity result" /><div className="grid divide-y divide-[var(--bp-border-soft)] xl:grid-cols-2 xl:divide-x xl:divide-y-0">{result.kind === "rest_remote" ? <><JsonResult label="Translator" value={result.data.inspect.translator} /><JsonResult label="Manager" value={result.data.inspect.manager} /><div className="border-t border-[var(--bp-border-soft)] xl:col-span-2"><JsonResult label="DALiuGE sessions" value={result.data.sessions} /></div></> : <><JsonResult label="SSH + Slurm" value={result.data.connectivity} /><div className="min-w-0 p-3"><p className="mb-2 text-[10px] uppercase text-[var(--bp-subtle)]">Rendered resource request</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap border border-[var(--bp-border-soft)] bg-black p-3 text-[10px] leading-5 text-[var(--bp-green)]">{result.data.rendered_resource_request}</pre></div></>}</div></section>;
}

function JsonResult({ label, value }: { label: string; value: unknown }) {
  return <div className="min-w-0 p-3"><p className="mb-2 text-[10px] uppercase text-[var(--bp-subtle)]">{label}</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap border border-[var(--bp-border-soft)] bg-black p-3 text-[10px] leading-5 text-[var(--bp-muted)]">{JSON.stringify(value, null, 2)}</pre></div>;
}

function ErrorStrip({ message }: { message: string }) {
  return <div className="border-b border-[var(--bp-red)]/50 px-3 py-2 text-[10px] leading-5 text-[var(--bp-red)]">! {message}</div>;
}
