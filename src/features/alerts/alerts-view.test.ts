import { describe, expect, it } from "vitest";
import type { NotificationChannel } from "@/shared/types/beampipe";
import { channelConfigPayload, channelDraftErrors, channelFromRow } from "./alerts-view";

const channel: NotificationChannel = {
  uuid: "channel-1",
  name: "ops",
  kind: "webhook",
  config: {
    url: "[REDACTED]",
    template: "slack",
    headers: { Authorization: "[REDACTED]", "X-Trace": "old" },
  },
  secret_fields: ["url", "headers.Authorization"],
  configured_fields: ["url", "headers.Authorization", "headers.X-Trace"],
  enabled: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: null,
};

describe("notification channel payload", () => {
  it("preserves blank redacted values and marks removed header rows for deletion", () => {
    const draft = channelFromRow(channel);
    draft.headers = draft.headers.filter((header) => header.key === "Authorization");
    expect(channelConfigPayload(draft, channel)).toEqual({
      template: "slack",
      headers: { "X-Trace": null },
    });
  });

  it("sends replacement values without exposing retained secrets", () => {
    const draft = channelFromRow(channel);
    draft.headers.push({ key: "X-New", value: "new" });
    expect(channelConfigPayload(draft, channel)).toEqual({
      template: "slack",
      headers: { "X-Trace": "old", "X-New": "new" },
    });
  });

  it("serializes a PagerDuty routing-key environment reference", () => {
    const draft = channelFromRow({
      ...channel,
      config: { url: "https://events.pagerduty.com/v2/enqueue", template: "pagerduty" },
      configured_fields: ["url", "template"],
      secret_fields: [],
    });
    draft.routingKeyRef = { source: "env", locator: "PAGERDUTY_ROUTING_KEY", configured: false };

    expect(channelDraftErrors(draft, false)).toEqual([]);
    expect(channelConfigPayload(draft)).toEqual({
      url: "https://events.pagerduty.com/v2/enqueue",
      template: "pagerduty",
      routing_key_ref: { env: "PAGERDUTY_ROUTING_KEY" },
    });
  });

  it("serializes authenticated SMTP with a file-backed password reference", () => {
    const draft = channelFromRow({
      ...channel,
      kind: "email",
      config: { smtp_host: "smtp.example.test", port: 2525, from: "beampipe@example.test", to: ["ops@example.test"], user: "beampipe" },
      configured_fields: ["smtp_host", "port", "from", "to", "user"],
      secret_fields: [],
    });
    draft.passwordRef = { source: "file", locator: "/run/secrets/smtp_password", configured: false };

    expect(channelDraftErrors(draft, false)).toEqual([]);
    expect(channelConfigPayload(draft)).toEqual({
      smtp_host: "smtp.example.test",
      port: 2525,
      from: "beampipe@example.test",
      to: ["ops@example.test"],
      user: "beampipe",
      password_ref: { file: "/run/secrets/smtp_password" },
    });
  });

  it("retains an existing redacted secret reference when its replacement is blank", () => {
    const existing: NotificationChannel = {
      ...channel,
      kind: "email",
      config: { smtp_host: "smtp.example.test", port: 587, to: ["ops@example.test"], user: "beampipe", password_ref: "[REDACTED]" },
      configured_fields: ["smtp_host", "port", "to", "user", "password_ref"],
      secret_fields: ["password_ref"],
    };
    const draft = channelFromRow(existing);

    expect(draft.passwordRef.configured).toBe(true);
    expect(channelDraftErrors(draft, true)).toEqual([]);
    expect(channelConfigPayload(draft, existing)).toEqual({
      smtp_host: "smtp.example.test",
      port: 587,
      to: ["ops@example.test"],
      user: "beampipe",
    });

    const objectRedaction = channelFromRow({
      ...existing,
      config: { ...existing.config, password_ref: { file: "[REDACTED]" } },
    });
    expect(objectRedaction.passwordRef).toEqual({ source: "file", locator: "", configured: true });
    expect(channelConfigPayload(objectRedaction, existing)).not.toHaveProperty("password_ref");
  });

  it("blocks incomplete delivery configurations before save", () => {
    const pagerDuty = channelFromRow({ ...channel, config: { url: "https://events.pagerduty.com/v2/enqueue", template: "pagerduty" }, configured_fields: ["url", "template"], secret_fields: [] });
    expect(channelDraftErrors(pagerDuty, false)).toContain("PagerDuty routing key reference is required");

    const email = channelFromRow({ ...channel, kind: "email", config: { smtp_host: "smtp.example.test", port: 70_000, to: [], user: "beampipe" }, configured_fields: ["smtp_host", "port", "to", "user"], secret_fields: [] });
    expect(channelDraftErrors(email, false)).toEqual(expect.arrayContaining([
      "SMTP port must be between 1 and 65535",
      "At least one email recipient is required",
      "SMTP password reference is required when a user is set",
    ]));
  });
});
