import { describe, expect, it } from "vitest";
import { safeExternalUrl } from "./http";
import { metricByLabel, parsePrometheus, summarizeApiTraffic } from "./prometheus";

const fixture = `
# HELP beampipe_api_requests_total API requests
beampipe_api_requests_total{method="GET",route="/api/v2/overview",status="200"} 12
beampipe_api_requests_total{method="GET",route="/api/v2/overview",status="500"} 1
beampipe_api_request_duration_seconds_sum{method="GET",route="/api/v2/overview",status="200"} 2.6
beampipe_api_request_duration_seconds_count{method="GET",route="/api/v2/overview",status="200"} 13
beampipe_jobs_queued{kind="execute"} 3
`;

describe("Prometheus parsing", () => {
  it("parses labels and groups gauges", () => {
    const samples = parsePrometheus(fixture);
    expect(metricByLabel(samples, "beampipe_jobs_queued", "kind")).toEqual([{ key: "execute", value: 3 }]);
  });

  it("summarizes API volume, failures, and latency", () => {
    const summary = summarizeApiTraffic(parsePrometheus(fixture));
    expect(summary.totalRequests).toBe(13);
    expect(summary.serverErrors).toBe(1);
    expect(summary.averageDurationSeconds).toBe(0.2);
    expect(summary.routes[0]).toEqual({ route: "/api/v2/overview", requests: 13, serverErrors: 1 });
  });
});

describe("external URL policy", () => {
  it("allows HTTP operator links and rejects unsafe schemes", () => {
    expect(safeExternalUrl("https://manager.example/sessions/123")).toBe("https://manager.example/sessions/123");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("file:///private/key")).toBeNull();
  });
});
