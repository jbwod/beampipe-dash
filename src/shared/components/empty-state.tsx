import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="ascii-corners flex min-h-52 flex-col items-center justify-center border border-[var(--bp-border)] bg-[var(--bp-panel)] px-5 text-center">
      <Icon className="mb-4 size-5 text-[var(--bp-subtle)]" aria-hidden="true" />
      <p className="text-sm text-[var(--bp-text)]">{title}</p>
      <p className="mt-2 max-w-md text-pretty text-xs leading-5 text-[var(--bp-muted)]">{detail}</p>
    </div>
  );
}
