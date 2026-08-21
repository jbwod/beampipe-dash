"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, PlugZap, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { ActionDialog } from "@/shared/components/action-dialog";
import { DataTable, TableFrame, TableHead, Td, Th } from "@/shared/components/data-table";
import { EmptyRows, LiveIndicator, LoadingRows, QueryFailure, SectionHeading } from "@/shared/components/operator-ui";
import { StatusBadge } from "@/shared/components/status-badge";
import { dashboardFetch } from "@/shared/lib/http";
import { formatAge, formatDateTime } from "@/shared/lib/time";
import type { AlertDelivery, AlertRule, NotificationChannel, NotificationChannelTestResponse, ProjectListItem } from "@/shared/types/beampipe";
import { useCurrentUser, useProjects } from "@/features/monitoring/queries";
import { useAlertDeliveries, useAlertRules, useNotificationChannels } from "./queries";

const REDACTED = "[REDACTED]";
const inputClass = "h-9 w-full min-w-0 border border-[var(--bp-border-soft)] bg-black px-2.5 text-xs text-[var(--bp-text)] placeholder:text-[var(--bp-subtle)]";
const TRIGGER_KINDS = [
  { value: "execution_terminal", label: "Execution failure" },
  { value: "discovery_changed", label: "Discovery changed" },
  { value: "daily_summary", label: "Daily summary" },
  { value: "pending_backlog", label: "Pending backlog" },
  { value: "pending_stale", label: "Pending stale" },
  { value: "discovery_stall", label: "Discovery stall" },
  { value: "dependency_down", label: "Dependency down" },
] as const;
const SEVERITIES = ["info", "warning", "critical"] as const;
const TEMPLATES = ["generic", "slack", "pagerduty"] as const;

export type ChannelDraft = {
  name: string;
  kind: "webhook" | "email";
  url: string;
  template: string;
  headers: Array<{ key: string; value: string }>;
  smtpHost: string;
  from: string;
  to: string;
  password: string;
  enabled: boolean;
};

type RuleDraft = {
  name: string;
  projectModule: string;
  severity: string;
  triggerKind: string;
  cooldownMinutes: number;
  channelIds: string[];
  enabled: boolean;
  threshold: number;
  maxAgeSeconds: number;
  windowMinutes: number;
  windowHours: number;
  dependency: string;
};

type TestNotice = { deliveryId: string; status: string; error: string | null; summary: string };

function emptyChannel(): ChannelDraft {
  return { name: "", kind: "webhook", url: "", template: "slack", headers: [], smtpHost: "", from: "", to: "", password: "", enabled: true };
}

function emptyRule(project: string): RuleDraft {
  return { name: "", projectModule: project, severity: "critical", triggerKind: "execution_terminal", cooldownMinutes: 60, channelIds: [], enabled: true, threshold: 50, maxAgeSeconds: 21_600, windowMinutes: 120, windowHours: 24, dependency: "postgres" };
}

function configString(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "string" ? value : "";
}

export function channelFromRow(row: NotificationChannel): ChannelDraft {
  const config = row.config ?? {};
  const url = configString(config, "url");
  const password = configString(config, "password");
  const headers = config.headers && typeof config.headers === "object" && !Array.isArray(config.headers)
    ? Object.entries(config.headers as Record<string, unknown>).map(([key, value]) => ({ key, value: typeof value === "string" ? value : "" }))
    : [];
  const to = Array.isArray(config.to) ? config.to.filter((item): item is string => typeof item === "string").join(", ") : "";
  return {
    name: row.name,
    kind: row.kind === "email" ? "email" : "webhook",
    url: url === REDACTED ? "" : url,
    template: configString(config, "template") || "generic",
    headers: headers.map((header) => ({ ...header, value: header.value === REDACTED ? "" : header.value })),
    smtpHost: configString(config, "smtp_host"),
    from: configString(config, "from"),
    to,
    password: password === REDACTED ? "" : password,
    enabled: row.enabled,
  };
}

function ruleFromRow(row: AlertRule): RuleDraft {
  const config = row.trigger_config ?? {};
  return {
    name: row.name,
    projectModule: row.project_module ?? "",
    severity: row.severity,
    triggerKind: row.trigger_kind,
    cooldownMinutes: row.cooldown_minutes,
    channelIds: row.channel_ids,
    enabled: row.enabled,
    threshold: Number(config.threshold ?? 50),
    maxAgeSeconds: Number(config.max_age_seconds ?? 21_600),
    windowMinutes: Number(config.window_minutes ?? 120),
    windowHours: Number(config.window_hours ?? 24),
    dependency: typeof config.dependency === "string" ? config.dependency : "postgres",
  };
}

export function channelConfigPayload(draft: ChannelDraft, existing?: NotificationChannel | null) {
  if (draft.kind === "email") {
    const config: Record<string, unknown> = {
      smtp_host: draft.smtpHost.trim(),
      from: draft.from.trim() || undefined,
      to: draft.to.split(",").map((item) => item.trim()).filter(Boolean),
    };
    if (draft.password.trim()) config.password = draft.password.trim();
    return config;
  }
  const draftHeaderKeys = new Set(draft.headers.map((header) => header.key.trim()).filter(Boolean));
  const headers: Record<string, string | null> = Object.fromEntries(draft.headers.filter((header) => header.key.trim() && header.value.trim()).map((header) => [header.key.trim(), header.value]));
  const existingHeaders = existing?.config.headers;
  if (existingHeaders && typeof existingHeaders === "object" && !Array.isArray(existingHeaders)) {
    for (const key of Object.keys(existingHeaders)) {
      if (!draftHeaderKeys.has(key)) headers[key] = null;
    }
  }
  const config: Record<string, unknown> = { template: draft.template };
  if (draft.url.trim()) config.url = draft.url.trim();
  if (Object.keys(headers).length) config.headers = headers;
  return config;
}

function triggerConfigPayload(draft: RuleDraft) {
  switch (draft.triggerKind) {
    case "pending_backlog":
      return { threshold: draft.threshold };
    case "pending_stale":
      return { max_age_seconds: draft.maxAgeSeconds };
    case "discovery_stall":
      return { window_minutes: draft.windowMinutes };
    case "dependency_down":
      return { dependency: draft.dependency || "postgres" };
    case "daily_summary":
      return { window_hours: draft.windowHours };
    default:
      return {};
  }
}

function payloadSummary(payload: unknown) {
  if (!payload || typeof payload !== "object") return "--";
  const summary = (payload as Record<string, unknown>).summary;
  return typeof summary === "string" && summary.length ? summary : "--";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">{label}</span>{children}</label>;
}

export function AlertsView() {
  const channels = useNotificationChannels();
  const rules = useAlertRules();
  const deliveries = useAlertDeliveries();
  const projects = useProjects();
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const isSuperuser = Boolean(currentUser.data?.is_superuser);
  const [channelOpen, setChannelOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [channelDraft, setChannelDraft] = useState<ChannelDraft>(emptyChannel());
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(emptyRule(""));
  const [deleteChannel, setDeleteChannel] = useState<NotificationChannel | null>(null);
  const [deleteRule, setDeleteRule] = useState<AlertRule | null>(null);
  const [testNotice, setTestNotice] = useState<TestNotice | null>(null);
  const fetching = [channels, rules, deliveries].some((query) => query.isFetching);
  const defaultProject = projects.data?.[0]?.project_id ?? "";

  const channelName = useMemo(() => new Map((channels.data ?? []).map((channel) => [channel.uuid, channel.name])), [channels.data]);
  const ruleName = useMemo(() => new Map((rules.data ?? []).map((rule) => [rule.uuid, rule.name])), [rules.data]);

  const saveChannel = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { name: channelDraft.name.trim(), enabled: channelDraft.enabled, config: channelConfigPayload(channelDraft, editingChannel) };
      if (!editingChannel) body.kind = channelDraft.kind;
      return dashboardFetch<NotificationChannel>(editingChannel ? `/api/beampipe/notification-channels/${editingChannel.uuid}` : "/api/beampipe/notification-channels", {
        method: editingChannel ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: async () => {
      setChannelOpen(false);
      setEditingChannel(null);
      await queryClient.invalidateQueries({ queryKey: ["notification-channels"] });
    },
  });

  const saveRule = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        name: ruleDraft.name.trim(),
        project_module: ruleDraft.projectModule,
        severity: ruleDraft.severity,
        trigger_kind: ruleDraft.triggerKind,
        trigger_config: triggerConfigPayload(ruleDraft),
        channel_ids: ruleDraft.channelIds,
        cooldown_minutes: ruleDraft.cooldownMinutes,
        enabled: ruleDraft.enabled,
      };
      return dashboardFetch<AlertRule>(editingRule ? `/api/beampipe/alert-rules/${editingRule.uuid}` : "/api/beampipe/alert-rules", {
        method: editingRule ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: async () => {
      setRuleOpen(false);
      setEditingRule(null);
      await queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
    },
  });

  const removeChannel = useMutation({
    mutationFn: (id: string) => dashboardFetch<void>(`/api/beampipe/notification-channels/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setDeleteChannel(null);
      await queryClient.invalidateQueries({ queryKey: ["notification-channels"] });
    },
  });

  const removeRule = useMutation({
    mutationFn: (id: string) => dashboardFetch<void>(`/api/beampipe/alert-rules/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setDeleteRule(null);
      await queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
    },
  });

  const testChannel = useMutation({
    mutationFn: async (id: string) => {
      const result = await dashboardFetch<NotificationChannelTestResponse>(`/api/beampipe/notification-channels/${id}/test`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["alert-deliveries"] });
      const rows = await queryClient.fetchQuery({
        queryKey: ["alert-deliveries", 50],
        queryFn: () => dashboardFetch<AlertDelivery[]>("/api/beampipe/alert-deliveries?limit=50"),
      });
      const delivery = rows.find((row) => row.uuid === result.delivery_id);
      return {
        deliveryId: result.delivery_id,
        status: delivery?.status ?? result.status,
        error: delivery?.error ?? null,
        summary: payloadSummary(delivery?.payload),
      } satisfies TestNotice;
    },
    onSuccess: setTestNotice,
  });

  const openNewChannel = () => {
    setEditingChannel(null);
    setChannelDraft(emptyChannel());
    setChannelOpen(true);
  };
  const openEditChannel = (row: NotificationChannel) => {
    setEditingChannel(row);
    setChannelDraft(channelFromRow(row));
    setChannelOpen(true);
  };
  const openNewRule = () => {
    setEditingRule(null);
    const draft = emptyRule(defaultProject);
    if (channels.data?.[0]) draft.channelIds = [channels.data[0].uuid];
    setRuleDraft(draft);
    setRuleOpen(true);
  };
  const openEditRule = (row: AlertRule) => {
    setEditingRule(row);
    setRuleDraft(ruleFromRow(row));
    setRuleOpen(true);
  };
  const changeTrigger = (triggerKind: string) => {
    setRuleDraft((current) => ({
      ...current,
      triggerKind,
      cooldownMinutes: triggerKind === "daily_summary" && current.cooldownMinutes === 60 ? 1440 : current.cooldownMinutes,
      severity: triggerKind === "execution_terminal" && current.severity === "warning" ? "critical" : current.severity,
    }));
  };

  const webhookCreateBlocked = !editingChannel && channelDraft.kind === "webhook" && !channelDraft.url.trim();
  const emailCreateBlocked = channelDraft.kind === "email" && !channelDraft.smtpHost.trim();

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex justify-end"><LiveIndicator fetching={fetching} /></div>
      {testNotice ? <p className="mb-4 border border-[var(--bp-border)] px-3 py-2 text-[11px] text-[var(--bp-muted)]">Test delivery {testNotice.status}: {testNotice.summary}{testNotice.error ? ` — ${testNotice.error}` : ""}</p> : null}

      <section className="mb-4 border border-[var(--bp-border)]">
        <SectionHeading action={isSuperuser ? <button className="inline-flex h-7 items-center gap-1 border border-[var(--bp-border)] px-2 text-[10px] uppercase text-[var(--bp-cyan)]" onClick={openNewChannel} type="button"><Plus className="size-3" />Channel</button> : null} detail="webhook POST or SMTP" title="Channels" />
        {channels.isError ? <QueryFailure message="Notification channels could not be loaded" retry={() => channels.refetch()} /> : channels.isPending ? <LoadingRows rows={4} /> : (
          <TableFrame className="border-0">
            <DataTable>
              <TableHead><tr><Th>Name</Th><Th className="w-[110px]">Kind</Th><Th className="w-[120px]">Template</Th><Th className="w-[110px]">Enabled</Th><Th className="w-[140px]">Updated</Th><Th className="w-[108px]"><span className="sr-only">Actions</span></Th></tr></TableHead>
              <tbody>
                {channels.data?.map((channel) => (
                  <tr className="hover:bg-[var(--bp-panel-soft)]" key={channel.uuid}>
                    <Td>{channel.name}</Td>
                    <Td><StatusBadge status={channel.kind} /></Td>
                    <Td className="text-[10px] uppercase text-[var(--bp-muted)]">{configString(channel.config, "template") || "--"}</Td>
                    <Td><StatusBadge status={channel.enabled ? "enabled" : "disabled"} /></Td>
                    <Td className="text-[10px] text-[var(--bp-muted)]">{formatAge(channel.updated_at ?? channel.created_at)}</Td>
                    <Td>
                      {isSuperuser ? (
                        <div className="flex gap-1">
                          <button aria-label={`Test ${channel.name}`} className="grid size-7 place-items-center border border-[var(--bp-border)] text-[var(--bp-cyan)] disabled:opacity-40" disabled={testChannel.isPending} onClick={() => testChannel.mutate(channel.uuid)} title="Send test notification" type="button"><PlugZap className="size-3.5" /></button>
                          <button aria-label={`Edit ${channel.name}`} className="grid size-7 place-items-center border border-[var(--bp-border)] text-[var(--bp-muted)] hover:text-[var(--bp-cyan)]" onClick={() => openEditChannel(channel)} type="button"><Pencil className="size-3.5" /></button>
                          <button aria-label={`Delete ${channel.name}`} className="grid size-7 place-items-center border border-[var(--bp-red)]/50 text-[var(--bp-red)]" onClick={() => setDeleteChannel(channel)} type="button"><Trash2 className="size-3.5" /></button>
                        </div>
                      ) : null}
                    </Td>
                  </tr>
                ))}
                {!channels.data?.length ? <tr><td colSpan={6}><EmptyRows message="no notification channels" /></td></tr> : null}
              </tbody>
            </DataTable>
          </TableFrame>
        )}
        {testChannel.isError ? <p className="border-t border-[var(--bp-red)]/40 px-3 py-2 text-[11px] text-[var(--bp-red)]">Test send failed</p> : null}
        {saveChannel.isError ? <p className="border-t border-[var(--bp-red)]/40 px-3 py-2 text-[11px] text-[var(--bp-red)]">{saveChannel.error.message}</p> : null}
      </section>

      <section className="mb-4 border border-[var(--bp-border)]">
        <SectionHeading action={isSuperuser ? <button className="inline-flex h-7 items-center gap-1 border border-[var(--bp-border)] px-2 text-[10px] uppercase text-[var(--bp-cyan)]" onClick={openNewRule} type="button"><Plus className="size-3" />Rule</button> : null} detail="bind a trigger to channels" title="Rules" />
        {rules.isError ? <QueryFailure message="Alert rules could not be loaded" retry={() => rules.refetch()} /> : rules.isPending ? <LoadingRows rows={4} /> : (
          <TableFrame className="border-0">
            <DataTable className="min-w-[960px]">
              <TableHead><tr><Th>Name</Th><Th className="w-[140px]">Project</Th><Th className="w-[150px]">Trigger</Th><Th className="w-[110px]">Severity</Th><Th className="w-[90px]">Cooldown</Th><Th>Channels</Th><Th className="w-[110px]">Enabled</Th><Th className="w-[120px]">Last fired</Th><Th className="w-[72px]"><span className="sr-only">Actions</span></Th></tr></TableHead>
              <tbody>
                {rules.data?.map((rule) => (
                  <tr className="hover:bg-[var(--bp-panel-soft)]" key={rule.uuid}>
                    <Td>{rule.name}</Td>
                    <Td className="truncate text-[var(--bp-muted)]">{rule.project_module ?? "--"}</Td>
                    <Td className="text-[10px] uppercase">{rule.trigger_kind.replaceAll("_", " ")}</Td>
                    <Td><StatusBadge status={rule.severity} /></Td>
                    <Td className="tabular-nums">{rule.cooldown_minutes}m</Td>
                    <Td className="truncate text-[10px] text-[var(--bp-muted)]">{rule.channel_ids.map((id) => channelName.get(id) ?? id.slice(0, 8)).join(", ") || "--"}</Td>
                    <Td><StatusBadge status={rule.enabled ? "enabled" : "disabled"} /></Td>
                    <Td className="text-[10px] text-[var(--bp-muted)]">{formatAge(rule.last_fired_at)}</Td>
                    <Td>
                      {isSuperuser ? (
                        <div className="flex gap-1">
                          <button aria-label={`Edit ${rule.name}`} className="grid size-7 place-items-center border border-[var(--bp-border)] text-[var(--bp-muted)] hover:text-[var(--bp-cyan)]" onClick={() => openEditRule(rule)} type="button"><Pencil className="size-3.5" /></button>
                          <button aria-label={`Delete ${rule.name}`} className="grid size-7 place-items-center border border-[var(--bp-red)]/50 text-[var(--bp-red)]" onClick={() => setDeleteRule(rule)} type="button"><Trash2 className="size-3.5" /></button>
                        </div>
                      ) : null}
                    </Td>
                  </tr>
                ))}
                {!rules.data?.length ? <tr><td colSpan={9}><EmptyRows message="no alert rules" /></td></tr> : null}
              </tbody>
            </DataTable>
          </TableFrame>
        )}
        {saveRule.isError ? <p className="border-t border-[var(--bp-red)]/40 px-3 py-2 text-[11px] text-[var(--bp-red)]">{saveRule.error.message}</p> : null}
      </section>

      <section className="border border-[var(--bp-border)]">
        <SectionHeading detail="last 50 redacted deliveries" title="Deliveries" />
        {deliveries.isError ? <QueryFailure message="Alert deliveries could not be loaded" retry={() => deliveries.refetch()} /> : deliveries.isPending ? <LoadingRows rows={5} /> : (
          <TableFrame className="border-0">
            <DataTable>
              <TableHead><tr><Th className="w-[170px]">Time</Th><Th className="w-[160px]">Rule</Th><Th className="w-[160px]">Channel</Th><Th className="w-[110px]">Status</Th><Th>Summary / error</Th></tr></TableHead>
              <tbody>
                {deliveries.data?.map((delivery) => (
                  <tr className="hover:bg-[var(--bp-panel-soft)]" key={delivery.uuid}>
                    <Td className="text-[10px] text-[var(--bp-muted)]">{formatDateTime(delivery.created_at)}</Td>
                    <Td className="truncate">{delivery.rule_id ? ruleName.get(delivery.rule_id) ?? delivery.rule_id.slice(0, 8) : "test"}</Td>
                    <Td className="truncate">{delivery.channel_id ? channelName.get(delivery.channel_id) ?? delivery.channel_id.slice(0, 8) : "--"}</Td>
                    <Td><StatusBadge status={delivery.status} /></Td>
                    <Td><p className="truncate">{payloadSummary(delivery.payload)}</p>{delivery.error ? <p className="truncate text-[10px] text-[var(--bp-red)]">{delivery.error}</p> : null}</Td>
                  </tr>
                ))}
                {!deliveries.data?.length ? <tr><td colSpan={5}><EmptyRows message="no deliveries yet" /></td></tr> : null}
              </tbody>
            </DataTable>
          </TableFrame>
        )}
      </section>

      <ActionDialog description={editingChannel ? `Update ${editingChannel.name}. Leave secret fields blank to keep the stored value.` : "Register a webhook (Slack, PagerDuty, or generic HTTP) or an SMTP channel."} onOpenChange={setChannelOpen} open={channelOpen} title={editingChannel ? "Edit channel" : "New channel"}>
        <div className="grid gap-3">
          <Field label="Name"><input className={inputClass} onChange={(event) => setChannelDraft((current) => ({ ...current, name: event.target.value }))} value={channelDraft.name} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kind">
              <select className={inputClass} disabled={Boolean(editingChannel)} onChange={(event) => setChannelDraft((current) => ({ ...current, kind: event.target.value === "email" ? "email" : "webhook" }))} value={channelDraft.kind}>
                <option value="webhook">webhook</option>
                <option value="email">email</option>
              </select>
            </Field>
            <label className="flex items-end gap-2 pb-1 text-[11px] uppercase text-[var(--bp-muted)]">
              <input checked={channelDraft.enabled} onChange={(event) => setChannelDraft((current) => ({ ...current, enabled: event.target.checked }))} type="checkbox" />
              Enabled
            </label>
          </div>
          {channelDraft.kind === "webhook" ? (
            <>
              <Field label="Webhook URL"><input autoComplete="off" className={inputClass} onChange={(event) => setChannelDraft((current) => ({ ...current, url: event.target.value }))} placeholder={editingChannel ? "leave blank to keep stored URL" : "https://hooks.slack.com/services/..."} type="url" value={channelDraft.url} /></Field>
              <Field label="Template">
                <select className={inputClass} onChange={(event) => setChannelDraft((current) => ({ ...current, template: event.target.value }))} value={channelDraft.template}>
                  {TEMPLATES.map((template) => <option key={template} value={template}>{template}</option>)}
                </select>
              </Field>
              <div>
                <p className="mb-1.5 text-[10px] uppercase text-[var(--bp-subtle)]">Headers</p>
                {channelDraft.headers.map((header, index) => (
                  <div className="mb-2 grid grid-cols-[1fr_1fr_32px] gap-2" key={`${header.key}-${index}`}>
                    <input className={inputClass} onChange={(event) => setChannelDraft((current) => ({ ...current, headers: current.headers.map((item, itemIndex) => itemIndex === index ? { ...item, key: event.target.value } : item) }))} placeholder="Authorization" value={header.key} />
                    <input autoComplete="off" className={inputClass} onChange={(event) => setChannelDraft((current) => ({ ...current, headers: current.headers.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item) }))} placeholder="leave blank to keep" value={header.value} />
                    <button className="grid size-9 place-items-center border border-[var(--bp-red)]/40 text-[var(--bp-red)]" onClick={() => setChannelDraft((current) => ({ ...current, headers: current.headers.filter((_, itemIndex) => itemIndex !== index) }))} type="button"><Trash2 className="size-3.5" /></button>
                  </div>
                ))}
                <button className="h-8 border border-[var(--bp-border)] px-2 text-[10px] uppercase text-[var(--bp-cyan)]" onClick={() => setChannelDraft((current) => ({ ...current, headers: [...current.headers, { key: "", value: "" }] }))} type="button">+ Header</button>
              </div>
            </>
          ) : (
            <>
              <Field label="SMTP host"><input className={inputClass} onChange={(event) => setChannelDraft((current) => ({ ...current, smtpHost: event.target.value }))} value={channelDraft.smtpHost} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="From"><input className={inputClass} onChange={(event) => setChannelDraft((current) => ({ ...current, from: event.target.value }))} value={channelDraft.from} /></Field>
                <Field label="To"><input className={inputClass} onChange={(event) => setChannelDraft((current) => ({ ...current, to: event.target.value }))} placeholder="ops@example.test" value={channelDraft.to} /></Field>
              </div>
              <Field label="Password"><input autoComplete="new-password" className={inputClass} onChange={(event) => setChannelDraft((current) => ({ ...current, password: event.target.value }))} placeholder={editingChannel ? "leave blank to keep stored password" : "or use an env ref in Core"} type="password" value={channelDraft.password} /></Field>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button className="h-8 border border-[var(--bp-border)] px-3 text-[10px] uppercase text-[var(--bp-muted)]" onClick={() => setChannelOpen(false)} type="button">Back</button>
            <button className="h-8 border border-[var(--bp-green)] px-3 text-[10px] uppercase text-[var(--bp-green)] disabled:opacity-40" disabled={!isSuperuser || saveChannel.isPending || !channelDraft.name.trim() || webhookCreateBlocked || emailCreateBlocked} onClick={() => saveChannel.mutate()} type="button">{saveChannel.isPending ? "Saving" : editingChannel ? "Save channel" : "Create channel"}</button>
          </div>
        </div>
      </ActionDialog>

      <ActionDialog description={editingRule ? `Update ${editingRule.name}.` : "Bind a trigger kind to one or more channels. Scheduled rules require a project module."} onOpenChange={setRuleOpen} open={ruleOpen} title={editingRule ? "Edit rule" : "New rule"}>
        <div className="grid gap-3">
          <Field label="Name"><input className={inputClass} onChange={(event) => setRuleDraft((current) => ({ ...current, name: event.target.value }))} value={ruleDraft.name} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Project">
              <select className={inputClass} onChange={(event) => setRuleDraft((current) => ({ ...current, projectModule: event.target.value }))} value={ruleDraft.projectModule}>
                <option value="">select project</option>
                {(projects.data ?? []).map((project: ProjectListItem) => <option key={project.project_id} value={project.project_id}>{project.project_id}</option>)}
              </select>
            </Field>
            <Field label="Trigger">
              <select className={inputClass} onChange={(event) => changeTrigger(event.target.value)} value={ruleDraft.triggerKind}>
                {TRIGGER_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Severity">
              <select className={inputClass} onChange={(event) => setRuleDraft((current) => ({ ...current, severity: event.target.value }))} value={ruleDraft.severity}>
                {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
              </select>
            </Field>
            <Field label="Cooldown (minutes)"><input className={inputClass} min={0} onChange={(event) => setRuleDraft((current) => ({ ...current, cooldownMinutes: Number(event.target.value) }))} type="number" value={ruleDraft.cooldownMinutes} /></Field>
            <label className="flex items-end gap-2 pb-1 text-[11px] uppercase text-[var(--bp-muted)]">
              <input checked={ruleDraft.enabled} onChange={(event) => setRuleDraft((current) => ({ ...current, enabled: event.target.checked }))} type="checkbox" />
              Enabled
            </label>
          </div>
          {ruleDraft.triggerKind === "pending_backlog" ? <Field label="Pending threshold"><input className={inputClass} min={1} onChange={(event) => setRuleDraft((current) => ({ ...current, threshold: Number(event.target.value) }))} type="number" value={ruleDraft.threshold} /></Field> : null}
          {ruleDraft.triggerKind === "pending_stale" ? <Field label="Max age (seconds)"><input className={inputClass} min={1} onChange={(event) => setRuleDraft((current) => ({ ...current, maxAgeSeconds: Number(event.target.value) }))} type="number" value={ruleDraft.maxAgeSeconds} /></Field> : null}
          {ruleDraft.triggerKind === "discovery_stall" ? <Field label="Window (minutes)"><input className={inputClass} min={1} onChange={(event) => setRuleDraft((current) => ({ ...current, windowMinutes: Number(event.target.value) }))} type="number" value={ruleDraft.windowMinutes} /></Field> : null}
          {ruleDraft.triggerKind === "daily_summary" ? <Field label="Window (hours)"><input className={inputClass} min={1} onChange={(event) => setRuleDraft((current) => ({ ...current, windowHours: Number(event.target.value) }))} type="number" value={ruleDraft.windowHours} /></Field> : null}
          {ruleDraft.triggerKind === "dependency_down" ? <Field label="Dependency"><input className={inputClass} onChange={(event) => setRuleDraft((current) => ({ ...current, dependency: event.target.value }))} value={ruleDraft.dependency} /></Field> : null}
          <div>
            <p className="mb-1.5 text-[10px] uppercase text-[var(--bp-subtle)]">Channels</p>
            <div className="max-h-40 space-y-1 overflow-y-auto border border-[var(--bp-border-soft)] p-2">
              {(channels.data ?? []).map((channel) => (
                <label className="flex items-center gap-2 text-xs" key={channel.uuid}>
                  <input checked={ruleDraft.channelIds.includes(channel.uuid)} onChange={(event) => setRuleDraft((current) => ({ ...current, channelIds: event.target.checked ? [...current.channelIds, channel.uuid] : current.channelIds.filter((id) => id !== channel.uuid) }))} type="checkbox" />
                  {channel.name} <span className="text-[10px] text-[var(--bp-subtle)]">{channel.kind}</span>
                </label>
              ))}
              {!channels.data?.length ? <p className="text-[10px] text-[var(--bp-subtle)]">Create a channel first</p> : null}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="h-8 border border-[var(--bp-border)] px-3 text-[10px] uppercase text-[var(--bp-muted)]" onClick={() => setRuleOpen(false)} type="button">Back</button>
            <button className="h-8 border border-[var(--bp-green)] px-3 text-[10px] uppercase text-[var(--bp-green)] disabled:opacity-40" disabled={!isSuperuser || saveRule.isPending || !ruleDraft.name.trim() || !ruleDraft.projectModule || !ruleDraft.channelIds.length} onClick={() => saveRule.mutate()} type="button">{saveRule.isPending ? "Saving" : editingRule ? "Save rule" : "Create rule"}</button>
          </div>
        </div>
      </ActionDialog>

      <ActionDialog description={`Remove channel '${deleteChannel?.name ?? ""}'. Rules that still list it will skip the missing destination.`} onOpenChange={(open) => { if (!open) setDeleteChannel(null); }} open={Boolean(deleteChannel)} title="Delete channel">
        <div className="flex justify-end gap-2">
          <button className="h-8 border border-[var(--bp-border)] px-3 text-[10px] uppercase text-[var(--bp-muted)]" onClick={() => setDeleteChannel(null)} type="button">Back</button>
          <button className="h-8 border border-[var(--bp-red)] px-3 text-[10px] uppercase text-[var(--bp-red)] disabled:opacity-40" disabled={removeChannel.isPending || !deleteChannel} onClick={() => deleteChannel && removeChannel.mutate(deleteChannel.uuid)} type="button">{removeChannel.isPending ? "Deleting" : "Delete channel"}</button>
        </div>
      </ActionDialog>

      <ActionDialog description={`Remove rule '${deleteRule?.name ?? ""}'. Past deliveries stay in the audit log.`} onOpenChange={(open) => { if (!open) setDeleteRule(null); }} open={Boolean(deleteRule)} title="Delete rule">
        <div className="flex justify-end gap-2">
          <button className="h-8 border border-[var(--bp-border)] px-3 text-[10px] uppercase text-[var(--bp-muted)]" onClick={() => setDeleteRule(null)} type="button">Back</button>
          <button className="h-8 border border-[var(--bp-red)] px-3 text-[10px] uppercase text-[var(--bp-red)] disabled:opacity-40" disabled={removeRule.isPending || !deleteRule} onClick={() => deleteRule && removeRule.mutate(deleteRule.uuid)} type="button">{removeRule.isPending ? "Deleting" : "Delete rule"}</button>
        </div>
      </ActionDialog>
    </div>
  );
}
