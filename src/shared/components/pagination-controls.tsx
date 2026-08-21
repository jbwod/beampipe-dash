interface PaginationControlsProps {
  page?: number;
  totalPages?: number;
  hasPrevious?: boolean;
  hasNext: boolean;
  onPrevious?: () => void;
  onNext: () => void;
  nextLabel?: string;
}

export function PaginationControls({ page, totalPages, hasPrevious = false, hasNext, onPrevious, onNext, nextLabel = "Next" }: PaginationControlsProps) {
  return <div className="flex items-center justify-end gap-2 border-t border-[var(--bp-border-soft)] px-3 py-2 text-[10px] uppercase text-[var(--bp-subtle)]">
    {page != null ? <span className="mr-auto">page {page}{totalPages ? ` / ${totalPages}` : ""}</span> : null}
    {onPrevious ? <button className="h-7 border border-[var(--bp-border)] px-2 text-[var(--bp-muted)] disabled:opacity-30" disabled={!hasPrevious} onClick={onPrevious} type="button">Previous</button> : null}
    <button className="h-7 border border-[var(--bp-border)] px-2 text-[var(--bp-cyan)] disabled:opacity-30" disabled={!hasNext} onClick={onNext} type="button">{nextLabel}</button>
  </div>;
}
