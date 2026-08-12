"use client";

import { Check, ChevronRight, Copy, Download } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";

export function JsonExplorer({ value, label = "JSON", filename }: { value: unknown; label?: string; filename?: string }) {
  const [copied, setCopied] = useState(false);
  const serialized = JSON.stringify(value, null, 2) ?? "null";
  return (
    <div className="min-w-0 border border-[var(--bp-border-soft)] bg-black">
      <div className="flex h-8 items-center border-b border-[var(--bp-border-soft)] px-2 text-[10px] uppercase text-[var(--bp-subtle)]">
        <span className="truncate">{label}</span>
        <div className="ml-auto flex items-center gap-1">
          {filename ? <button aria-label={`Download ${label}`} className="grid size-6 place-items-center hover:text-[var(--bp-cyan)]" onClick={() => downloadText(filename, serialized)} title="Download JSON" type="button"><Download className="size-3" /></button> : null}
          <button aria-label={`Copy ${label}`} className="grid size-6 place-items-center hover:text-[var(--bp-cyan)]" onClick={async () => { await navigator.clipboard.writeText(serialized); setCopied(true); window.setTimeout(() => setCopied(false), 1_200); }} title="Copy JSON" type="button">{copied ? <Check className="size-3 text-[var(--bp-green)]" /> : <Copy className="size-3" />}</button>
        </div>
      </div>
      <div className="max-h-[560px] overflow-auto p-2 text-[11px] leading-5">
        <JsonNode depth={0} name="root" value={value} />
      </div>
    </div>
  );
}

function JsonNode({ name, value, depth }: { name: string; value: unknown; depth: number }) {
  const container = value !== null && typeof value === "object";
  const [open, setOpen] = useState(depth === 0);
  if (!container) return <div className="grid grid-cols-[minmax(80px,auto)_minmax(0,1fr)] gap-2"><span className="truncate text-[var(--bp-blue)]">{name}</span><Primitive value={value} /></div>;
  const entries = Object.entries(value as Record<string, unknown>);
  const array = Array.isArray(value);
  return (
    <div>
      <button aria-expanded={open} className="flex h-6 max-w-full items-center gap-1 text-left text-[var(--bp-highlight)] hover:text-[var(--bp-cyan)]" onClick={() => setOpen((current) => !current)} type="button"><ChevronRight className={cn("size-3 shrink-0", open && "rotate-90")} /><span className="truncate text-[var(--bp-blue)]">{name}</span><span className="shrink-0 text-[var(--bp-subtle)]">{array ? `[${entries.length}]` : `{${entries.length}}`}</span></button>
      {open ? <div className="ml-1 border-l border-[var(--bp-border-soft)] pl-3">{entries.length ? entries.map(([key, child]) => <JsonNode depth={depth + 1} key={key} name={array ? `[${key}]` : key} value={child} />) : <span className="text-[var(--bp-subtle)]">empty</span>}</div> : null}
    </div>
  );
}

function Primitive({ value }: { value: unknown }) {
  if (value === null) return <span className="text-[var(--bp-subtle)]">null</span>;
  if (typeof value === "boolean") return <span className="text-[var(--bp-amber)]">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-[var(--bp-green)]">{value}</span>;
  if (typeof value === "string" && /^https?:\/\//.test(value)) return <a className="break-all text-[var(--bp-cyan)] hover:underline" href={value} rel="noreferrer" target="_blank">{value}</a>;
  return <span className="break-all text-[var(--bp-muted)]">{String(value)}</span>;
}

export function downloadJson(filename: string, value: unknown) {
  downloadText(filename, JSON.stringify(value, null, 2) ?? "null");
}

function downloadText(filename: string, value: string) {
  const url = URL.createObjectURL(new Blob([value], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
