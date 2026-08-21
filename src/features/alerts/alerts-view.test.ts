import { describe, expect, it } from "vitest";
import type { NotificationChannel } from "@/shared/types/beampipe";
import { channelConfigPayload, channelFromRow } from "./alerts-view";

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
});
