export interface PrometheusSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

export interface ApiTrafficSummary {
  totalRequests: number;
  serverErrors: number;
  errorRate: number;
  averageDurationSeconds: number | null;
  routes: Array<{ route: string; requests: number; serverErrors: number }>;
}

export function parsePrometheus(text: string): PrometheusSample[] {
  const samples: PrometheusSample[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?|NaN|[+-]Inf)(?:\s+\d+)?$/);
    if (!match) continue;
    const value = Number(match[3]);
    if (!Number.isFinite(value)) continue;
    samples.push({ name: match[1], labels: parseLabels(match[2] ?? ""), value });
  }
  return samples;
}

function parseLabels(raw: string) {
  const labels: Record<string, string> = {};
  const expression = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:\\.|[^"])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(raw))) {
    labels[match[1]] = match[2].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return labels;
}

export function samplesNamed(samples: PrometheusSample[], name: string) {
  return samples.filter((sample) => sample.name === name);
}

export function metricValue(samples: PrometheusSample[], name: string) {
  return samplesNamed(samples, name).reduce((total, sample) => total + sample.value, 0);
}

export function metricByLabel(samples: PrometheusSample[], name: string, label: string) {
  const values = new Map<string, number>();
  for (const sample of samplesNamed(samples, name)) {
    const key = sample.labels[label] ?? "unknown";
    values.set(key, (values.get(key) ?? 0) + sample.value);
  }
  return [...values.entries()].map(([key, value]) => ({ key, value }));
}

export function summarizeApiTraffic(samples: PrometheusSample[]): ApiTrafficSummary {
  const requestSamples = samplesNamed(samples, "beampipe_api_requests_total");
  let totalRequests = 0;
  let serverErrors = 0;
  const routes = new Map<string, { requests: number; serverErrors: number }>();

  for (const sample of requestSamples) {
    totalRequests += sample.value;
    const isServerError = sample.labels.status?.startsWith("5") ?? false;
    if (isServerError) serverErrors += sample.value;
    const route = sample.labels.route ?? "unknown";
    const current = routes.get(route) ?? { requests: 0, serverErrors: 0 };
    current.requests += sample.value;
    if (isServerError) current.serverErrors += sample.value;
    routes.set(route, current);
  }

  const durationSum = metricValue(samples, "beampipe_api_request_duration_seconds_sum");
  const durationCount = metricValue(samples, "beampipe_api_request_duration_seconds_count");

  return {
    totalRequests,
    serverErrors,
    errorRate: totalRequests > 0 ? serverErrors / totalRequests : 0,
    averageDurationSeconds: durationCount > 0 ? durationSum / durationCount : null,
    routes: [...routes.entries()]
      .map(([route, values]) => ({ route, ...values }))
      .sort((left, right) => right.requests - left.requests),
  };
}
