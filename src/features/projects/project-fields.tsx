"use client";

import { Checkbox } from "@base-ui/react/checkbox";
import { Check, Plus, Trash2 } from "lucide-react";
import type { DiscoveryQueryDraft, MappingDraft, ProjectDraft, TransformDraft } from "./project-draft";

export type DraftPatch = (path: Array<string | number>, value: unknown) => void;

const inputClass = "h-9 w-full min-w-0 border border-[var(--bp-border-soft)] bg-black px-2.5 text-xs text-[var(--bp-text)] placeholder:text-[var(--bp-subtle)]";
const textareaClass = "w-full min-w-0 resize-y border border-[var(--bp-border-soft)] bg-black p-2.5 text-xs leading-5 text-[var(--bp-text)] placeholder:text-[var(--bp-subtle)]";

export function SectionBlock({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) {
  return <section className="border-b border-[var(--bp-border)] py-4 first:pt-0 last:border-b-0"><div className="mb-3"><h3 className="text-[11px] font-semibold uppercase text-[var(--bp-highlight)]">[ {title} ]</h3>{detail ? <p className="mt-1 text-[10px] text-[var(--bp-subtle)]">{detail}</p> : null}</div>{children}</section>;
}

export function FormGrid({ children, columns = 2 }: { children: React.ReactNode; columns?: 1 | 2 | 3 }) {
  return <div className={columns === 1 ? "grid gap-3" : columns === 3 ? "grid gap-3 md:grid-cols-3" : "grid gap-3 md:grid-cols-2"}>{children}</div>;
}

export function TextField({ label, value, onChange, placeholder, multiline = false, rows = 4, type = "text" }: { label: string; value: string | null | undefined; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; rows?: number; type?: "text" | "url" }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">{label}</span>{multiline ? <textarea className={textareaClass} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} value={value ?? ""} /> : <input className={inputClass} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value ?? ""} />}</label>;
}

export function NumberField({ label, value, onChange, min = 0, step = 1 }: { label: string; value: number | null | undefined; onChange: (value: number | null) => void; min?: number; step?: number }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">{label}</span><input className={inputClass} min={min} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} step={step} type="number" value={value ?? ""} /></label>;
}

export function ToggleField({ label, checked, onChange }: { label: string; checked: boolean | undefined; onChange: (checked: boolean) => void }) {
  return <label className="flex h-9 items-center gap-2 text-xs"><Checkbox.Root checked={Boolean(checked)} className="grid size-4 shrink-0 place-items-center border border-[var(--bp-border)] bg-black text-black data-checked:border-[var(--bp-green)] data-checked:bg-[var(--bp-green)]" onCheckedChange={(value) => onChange(value === true)}><Checkbox.Indicator><Check className="size-3" /></Checkbox.Indicator></Checkbox.Root><span>{label}</span></label>;
}

export function QueryCollection({ label, path, queries, onPatch }: { label: string; path: Array<string | number>; queries: DiscoveryQueryDraft[]; onPatch: DraftPatch }) {
  const setQueries = (next: DiscoveryQueryDraft[]) => onPatch(path, next);
  const singularLabel = label === "Queries" ? "query" : label.toLowerCase().replace(/s$/, "");
  return <SectionBlock detail={`${queries.length} config-defined TAP request${queries.length === 1 ? "" : "s"}`} title={label}><div className="space-y-3">{queries.map((query, index) => <div className="border border-[var(--bp-border-soft)] bg-[var(--bp-panel-soft)] p-3" key={`${query.name}-${index}`}><div className="mb-3 grid gap-3 md:grid-cols-[1fr_140px_1fr_32px]"><TextField label="Name" onChange={(value) => setQueries(replaceAt(queries, index, { ...query, name: value }))} value={query.name} /><label><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">Adapter</span><input className={inputClass} list="beampipe-adapters" onChange={(event) => setQueries(replaceAt(queries, index, { ...query, adapter: event.target.value }))} value={query.adapter} /></label><TextField label="Source transform" onChange={(value) => setQueries(replaceAt(queries, index, { ...query, source_id_transform: value || null }))} placeholder="optional transform" value={query.source_id_transform} /><IconButton label={`Delete ${query.name || label}`} onClick={() => setQueries(queries.filter((_, itemIndex) => itemIndex !== index))} tone="danger"><Trash2 className="size-3.5" /></IconButton></div><TextField label="ADQL template" multiline onChange={(value) => setQueries(replaceAt(queries, index, { ...query, template: value }))} placeholder="SELECT ... WHERE target = '{source_identifier}'" rows={8} value={query.template} /></div>)}<button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-border)] px-2 text-[10px] uppercase text-[var(--bp-cyan)] hover:bg-[var(--bp-cyan)]/10" onClick={() => setQueries([...queries, { name: `query_${queries.length + 1}`, adapter: "casda", template: "SELECT *\nFROM table_name\nWHERE source_id = '{source_identifier}'" }])} type="button"><Plus className="size-3" />Add {singularLabel}</button></div><datalist id="beampipe-adapters"><option value="casda" /><option value="vizier" /></datalist></SectionBlock>;
}

export function MappingEditor({ title, detail, path, mappings, transforms, onPatch }: { title: string; detail?: string; path: Array<string | number>; mappings: Record<string, MappingDraft>; transforms: string[]; onPatch: DraftPatch }) {
  const update = (oldKey: string, newKey: string, mapping: MappingDraft) => {
    const next = { ...mappings };
    delete next[oldKey];
    if (newKey) next[newKey] = mapping;
    onPatch(path, next);
  };
  return <SectionBlock detail={detail} title={title}><div className="space-y-2">{Object.entries(mappings).map(([key, mapping]) => <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_32px]" key={key}><TextField label="Output field" onChange={(value) => update(key, value, mapping)} value={key} /><TextField label="From" onChange={(value) => update(key, key, { ...mapping, from: value })} value={mapping.from} /><label><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">Transform</span><input className={inputClass} list="project-transforms" onChange={(event) => update(key, key, { ...mapping, transform: commaOrValue(event.target.value) })} value={formatTransform(mapping.transform)} /></label><IconButton label={`Delete ${key}`} onClick={() => update(key, "", mapping)} tone="danger"><Trash2 className="size-3.5" /></IconButton></div>)}<button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-border)] px-2 text-[10px] uppercase text-[var(--bp-cyan)]" onClick={() => onPatch(path, { ...mappings, [`field_${Object.keys(mappings).length + 1}`]: { from: "" } })} type="button"><Plus className="size-3" />Add mapping</button></div><datalist id="project-transforms">{transforms.map((transform) => <option key={transform} value={transform} />)}</datalist></SectionBlock>;
}

const transformKinds = ["identity", "trim", "lowercase", "uppercase", "replace", "add_prefix", "add_suffix", "default_if_empty", "chain", "strip_prefix", "extract_digits", "split_last", "is_present", "select_eval_file_by_size", "regex_extract"];

export function TransformEditor({ transforms, onPatch }: { transforms: Record<string, TransformDraft>; onPatch: DraftPatch }) {
  const set = (oldName: string, name: string, transform: TransformDraft) => { const next = { ...transforms }; delete next[oldName]; if (name) next[name] = transform; onPatch(["definitions", "transforms"], next); };
  return <SectionBlock detail={`${Object.keys(transforms).length} reusable normalization operation${Object.keys(transforms).length === 1 ? "" : "s"}`} title="Transforms"><div className="space-y-3">{Object.entries(transforms).map(([name, transform]) => <div className="border border-[var(--bp-border-soft)] p-3" key={name}><div className="grid gap-3 md:grid-cols-[1fr_1fr_32px]"><TextField label="Name" onChange={(value) => set(name, value, transform)} value={name} /><label><span className="mb-1.5 block text-[10px] uppercase text-[var(--bp-subtle)]">Kind</span><select className={inputClass} onChange={(event) => set(name, name, { kind: event.target.value })} value={transform.kind}>{transformKinds.map((kind) => <option key={kind} value={kind}>{kind.replaceAll("_", " ")}</option>)}</select></label><IconButton label={`Delete ${name}`} onClick={() => set(name, "", transform)} tone="danger"><Trash2 className="size-3.5" /></IconButton></div><TransformArguments name={name} onChange={(next) => set(name, name, next)} transform={transform} /></div>)}<button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-border)] px-2 text-[10px] uppercase text-[var(--bp-cyan)]" onClick={() => onPatch(["definitions", "transforms"], { ...transforms, [`transform_${Object.keys(transforms).length + 1}`]: { kind: "trim" } })} type="button"><Plus className="size-3" />Add transform</button></div></SectionBlock>;
}

function TransformArguments({ transform, onChange }: { name: string; transform: TransformDraft; onChange: (transform: TransformDraft) => void }) {
  if (["strip_prefix", "add_prefix"].includes(transform.kind)) return <div className="mt-3"><TextField label="Prefix" onChange={(prefix) => onChange({ ...transform, prefix })} value={transform.prefix} /></div>;
  if (transform.kind === "add_suffix") return <div className="mt-3"><TextField label="Suffix" onChange={(suffix) => onChange({ ...transform, suffix })} value={transform.suffix} /></div>;
  if (transform.kind === "chain") return <div className="mt-3"><TextField label="Steps (comma-separated)" onChange={(value) => onChange({ ...transform, steps: commaList(value) })} value={transform.steps?.join(", ")} /></div>;
  if (transform.kind === "split_last") return <div className="mt-3"><TextField label="Separators (comma-separated)" onChange={(value) => onChange({ ...transform, separators: commaList(value) })} value={transform.separators?.join(", ")} /></div>;
  if (transform.kind === "replace") return <div className="mt-3 grid gap-3 md:grid-cols-2"><TextField label="From" onChange={(from) => onChange({ ...transform, from })} value={transform.from} /><TextField label="To" onChange={(to) => onChange({ ...transform, to })} value={transform.to} /></div>;
  if (transform.kind === "default_if_empty") return <div className="mt-3"><TextField label="Default" onChange={(value) => onChange({ ...transform, default: value })} value={transform.default} /></div>;
  if (transform.kind === "regex_extract") return <div className="mt-3 grid gap-3 md:grid-cols-[1fr_120px]"><TextField label="Pattern" onChange={(pattern) => onChange({ ...transform, pattern })} value={transform.pattern} /><NumberField label="Group" min={0} onChange={(group) => onChange({ ...transform, group })} value={transform.group} /></div>;
  return null;
}

export function StringMapEditor({ title, path, values, onPatch }: { title: string; path: Array<string | number>; values: Record<string, unknown>; onPatch: DraftPatch }) {
  const update = (oldKey: string, newKey: string, value: unknown) => { const next = { ...values }; delete next[oldKey]; if (newKey) next[newKey] = value; onPatch(path, next); };
  return <SectionBlock title={title}><StringMapRows onAdd={() => onPatch(path, { ...values, [`field_${Object.keys(values).length + 1}`]: "" })} onUpdate={update} values={values} /></SectionBlock>;
}

export function GraphPatchEditor({ patches, onPatch }: { patches: ProjectDraft["graph_patches"]; onPatch: DraftPatch }) {
  const setPatches = (next: ProjectDraft["graph_patches"]) => onPatch(["graph_patches"], next);
  return <SectionBlock detail="Applied after manifest injection and before translation" title="Graph patches"><div className="space-y-3">{patches.map((patch, index) => { const updateSet = (oldKey: string, newKey: string, value: unknown) => { const next = { ...patch.set }; delete next[oldKey]; if (newKey) next[newKey] = value; setPatches(replaceAt(patches, index, { ...patch, set: next })); }; return <div className="border border-[var(--bp-border-soft)] p-3" key={`${patch.match.equals}-${index}`}><div className="mb-3 grid gap-3 md:grid-cols-[1fr_32px]"><TextField label="Node name equals" onChange={(equals) => setPatches(replaceAt(patches, index, { ...patch, match: { kind: "node_name", equals } }))} value={patch.match.equals} /><IconButton label="Delete graph patch" onClick={() => setPatches(patches.filter((_, patchIndex) => patchIndex !== index))} tone="danger"><Trash2 className="size-3.5" /></IconButton></div><p className="mb-2 text-[10px] uppercase text-[var(--bp-subtle)]">Set fields</p><StringMapRows onAdd={() => setPatches(replaceAt(patches, index, { ...patch, set: { ...patch.set, [`field_${Object.keys(patch.set).length + 1}`]: "" } }))} onUpdate={updateSet} values={patch.set} /></div>; })}<button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-border)] px-2 text-[10px] uppercase text-[var(--bp-cyan)]" onClick={() => setPatches([...patches, { match: { kind: "node_name", equals: "" }, set: { num_of_copies: "$count(sbids[].datasets[])" } }])} type="button"><Plus className="size-3" />Add patch</button></div></SectionBlock>;
}

function StringMapRows({ values, onUpdate, onAdd }: { values: Record<string, unknown>; onUpdate: (oldKey: string, newKey: string, value: unknown) => void; onAdd: () => void }) {
  return <div className="space-y-2">{Object.entries(values).map(([key, value]) => <div className="grid gap-2 md:grid-cols-[1fr_1.5fr_32px]" key={key}><TextField label="Field" onChange={(next) => onUpdate(key, next, value)} value={key} /><TextField label="Value" onChange={(next) => onUpdate(key, key, parseScalar(next))} value={formatScalar(value)} /><IconButton label={`Delete ${key}`} onClick={() => onUpdate(key, "", value)} tone="danger"><Trash2 className="size-3.5" /></IconButton></div>)}<button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-border)] px-2 text-[10px] uppercase text-[var(--bp-cyan)]" onClick={onAdd} type="button"><Plus className="size-3" />Add field</button></div>;
}

function IconButton({ label, onClick, children, tone = "normal" }: { label: string; onClick: () => void; children: React.ReactNode; tone?: "normal" | "danger" }) {
  return <button aria-label={label} className={tone === "danger" ? "mt-[22px] grid size-8 place-items-center border border-[var(--bp-border-soft)] text-[var(--bp-muted)] hover:border-[var(--bp-red)] hover:text-[var(--bp-red)]" : "mt-[22px] grid size-8 place-items-center border border-[var(--bp-border-soft)] text-[var(--bp-muted)]"} onClick={onClick} title={label} type="button">{children}</button>;
}

function replaceAt<T>(items: T[], index: number, value: T) { return items.map((item, itemIndex) => itemIndex === index ? value : item); }
export function commaList(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
function commaOrValue(value: string) { const values = commaList(value); return values.length > 1 ? values : values[0] || null; }
function formatTransform(value: string | string[] | null | undefined) { return Array.isArray(value) ? value.join(", ") : value ?? ""; }
function parseScalar(value: string): unknown { const trimmed = value.trim(); if (trimmed === "true") return true; if (trimmed === "false") return false; if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed); return value; }
function formatScalar(value: unknown) { return typeof value === "string" ? value : value == null ? "" : JSON.stringify(value); }
