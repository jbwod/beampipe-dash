export function formatDateTime(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function formatAge(value: string | null | undefined, now = Date.now()) {
  if (!value) return "never";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "unknown";
  const seconds = Math.round((now - timestamp) / 1000);
  const future = seconds < 0;
  const absolute = Math.abs(seconds);
  const [amount, unit] = absolute < 60
    ? [absolute, "s"]
    : absolute < 3_600
      ? [Math.round(absolute / 60), "m"]
      : absolute < 86_400
        ? [Math.round(absolute / 3_600), "h"]
        : [Math.round(absolute / 86_400), "d"];
  return future ? `in ${amount}${unit}` : `${amount}${unit} ago`;
}

export function formatSeconds(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return "--";
  if (seconds < 1) return `${Math.round(seconds * 1_000)}ms`;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ${Math.round((seconds % 3_600) / 60)}m`;
  return `${Math.floor(seconds / 86_400)}d ${Math.round((seconds % 86_400) / 3_600)}h`;
}

export function shortId(value: string | null | undefined, length = 8) {
  return value ? value.slice(0, length) : "--";
}
