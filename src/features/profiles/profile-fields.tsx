"use client";

import { Checkbox } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";

const inputClass = "h-9 w-full min-w-0 border border-[var(--bp-border-soft)] bg-black px-2.5 text-xs text-[var(--bp-text)] placeholder:text-[var(--bp-subtle)] disabled:cursor-not-allowed disabled:opacity-50";

export function ProfileSection({ children, detail, title }: { children: React.ReactNode; detail?: string; title: string }) {
  return <section className="border-b border-[var(--bp-border)] py-4 first:pt-0 last:border-b-0"><div className="mb-3"><h3 className="text-[11px] font-semibold uppercase text-[var(--bp-highlight)]">[ {title} ]</h3>{detail ? <p className="mt-1 text-[10px] text-[var(--bp-subtle)]">{detail}</p> : null}</div>{children}</section>;
}

export function ProfileGrid({ children, columns = 2 }: { children: React.ReactNode; columns?: 2 | 3 | 4 }) {
  const classes = columns === 4 ? "md:grid-cols-2 xl:grid-cols-4" : columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
  return <div className={`grid gap-3 ${classes}`}>{children}</div>;
}

export function ProfileTextField({ label, multiline = false, onChange, placeholder, rows = 4, type = "text", value }: { label: string; multiline?: boolean; onChange: (value: string) => void; placeholder?: string; rows?: number; type?: "text" | "url"; value: string | null | undefined }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">{label}</span>{multiline ? <textarea className="w-full min-w-0 resize-y border border-[var(--bp-border-soft)] bg-black p-2.5 text-xs leading-5" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} value={value ?? ""} /> : <input className={inputClass} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value ?? ""} />}</label>;
}

export function ProfileNumberField({ label, max, min = 0, onChange, value }: { label: string; max?: number; min?: number; onChange: (value: number | null) => void; value: number | null | undefined }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">{label}</span><input className={inputClass} max={max} min={min} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} type="number" value={value ?? ""} /></label>;
}

export function ProfileToggle({ checked, label, onChange }: { checked: boolean | null | undefined; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-9 items-center gap-2 text-xs"><Checkbox.Root checked={Boolean(checked)} className="grid size-4 shrink-0 place-items-center border border-[var(--bp-border)] bg-black text-black data-checked:border-[var(--bp-green)] data-checked:bg-[var(--bp-green)]" onCheckedChange={(value) => onChange(value === true)}><Checkbox.Indicator><Check className="size-3" /></Checkbox.Indicator></Checkbox.Root><span>{label}</span></label>;
}

export function ProfileSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: Array<{ label: string; value: string }>; value: string }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">{label}</span><select className={inputClass} onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
