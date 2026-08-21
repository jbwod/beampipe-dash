import { cn } from "@/shared/lib/cn";

export function TableFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain border border-[var(--bp-border)]", className)}>{children}</div>;
}

export function DataTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return <table className={cn("w-full min-w-[760px] table-fixed border-collapse text-left text-xs", className)}>{children}</table>;
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-[var(--bp-border)] bg-black text-[10px] uppercase text-[var(--bp-subtle)]">{children}</thead>;
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("h-8 px-3 font-normal", className)}>{children}</th>;
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("h-11 border-b border-[var(--bp-border-soft)] px-3 align-middle last:border-r-0", className)}>{children}</td>;
}
