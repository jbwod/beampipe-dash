export function PageHeader({
  index,
  title,
  description,
  actions,
}: {
  index: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex min-h-24 flex-col justify-between gap-4 border-b border-[var(--bp-border)] px-4 py-4 sm:flex-row sm:items-end sm:px-6">
      <div>
        <p className="mb-2 text-[10px] text-[var(--bp-cyan)]">[{index} / CONTROL PLANE]</p>
        <h1 className="text-balance text-xl font-semibold">{title}</h1>
        <p className="mt-1 max-w-3xl text-pretty text-xs leading-5 text-[var(--bp-muted)]">{description}</p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
