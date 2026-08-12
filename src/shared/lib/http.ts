export class DashboardApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "DashboardApiError";
  }
}

export async function dashboardFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const body = await response.text();
  const parsed = body ? safeJson(body) : null;
  if (!response.ok) {
    const message =
      getMessage(parsed) ?? `${response.status} ${response.statusText || "request failed"}`;
    throw new DashboardApiError(message, response.status, parsed);
  }
  return parsed as T;
}

export function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return typeof value === "string" ? value : null;
  for (const key of ["message", "detail", "error"]) {
    const candidate = (value as Record<string, unknown>)[key];
    if (typeof candidate === "string") return candidate;
  }
  return null;
}
