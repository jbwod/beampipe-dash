"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Play, RotateCcw, Square } from "lucide-react";
import { useState } from "react";
import { ActionDialog } from "@/shared/components/action-dialog";
import { dashboardFetch, safeExternalUrl } from "@/shared/lib/http";
import type { Execution } from "@/shared/types/beampipe";

type Operation = "start" | "retry" | "cancel";

export function RunActions({ run }: { run: Execution }) {
  const [dialog, setDialog] = useState<Operation | null>(null);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const operation = useMutation({
    mutationFn: async (kind: Operation) => {
      if (kind === "start") return dashboardFetch(`/api/beampipe/executions/${run.uuid}/execute`, { method: "POST", body: JSON.stringify({ do_stage: true, do_submit: true }) });
      if (kind === "retry") return dashboardFetch(`/api/beampipe/executions/${run.uuid}/retry`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) });
      return dashboardFetch(`/api/beampipe/executions/${run.uuid}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
    },
    onSuccess: (_, kind) => {
      setResult(kind === "start" ? "Execution queued" : kind === "retry" ? "Recovery queued" : "Cancellation confirmed");
      setDialog(null);
      setReason("");
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey.includes(run.uuid) || query.queryKey[0] === "executions" });
    },
  });
  const active = ["running", "awaiting_scheduler"].includes(run.status);
  const retryable = run.status === "failed";
  const pending = run.status === "pending";
  const dimSessionUrl = safeExternalUrl(run.dim_session_status_url);

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {dimSessionUrl ? <a className="inline-flex h-8 items-center gap-2 border border-[var(--bp-border)] px-2 text-[10px] uppercase text-[var(--bp-muted)] hover:border-[var(--bp-cyan)] hover:text-[var(--bp-cyan)]" href={dimSessionUrl} rel="noreferrer" target="_blank"><ExternalLink className="size-3" />DIM session</a> : null}
        {pending ? <button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-green)]/60 px-2 text-[10px] uppercase text-[var(--bp-green)] hover:bg-[var(--bp-green)]/10" onClick={() => setDialog("start")} type="button"><Play className="size-3" />Start</button> : null}
        {retryable ? <button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-amber)]/60 px-2 text-[10px] uppercase text-[var(--bp-amber)] hover:bg-[var(--bp-amber)]/10" onClick={() => setDialog("retry")} type="button"><RotateCcw className="size-3" />Retry</button> : null}
        {active ? <button className="inline-flex h-8 items-center gap-2 border border-[var(--bp-red)]/60 px-2 text-[10px] uppercase text-[var(--bp-red)] hover:bg-[var(--bp-red)]/10" onClick={() => setDialog("cancel")} type="button"><Square className="size-3" />Cancel</button> : null}
      </div>
      {result ? <p className="mt-2 text-right text-[10px] uppercase text-[var(--bp-green)]">+ {result}</p> : null}
      {operation.isError ? <p className="mt-2 max-w-xl text-right text-[10px] leading-4 text-[var(--bp-red)]">! {operation.error.message}</p> : null}

      <ActionDialog description="Stages the selected source datasets, prepares the graph, and submits it through the pinned deployment profile." onOpenChange={(open) => setDialog(open ? "start" : null)} open={dialog === "start"} title="Start execution">
        <DialogFooter busy={operation.isPending} confirm="Queue execution" onCancel={() => setDialog(null)} onConfirm={() => operation.mutate("start")} />
      </ActionDialog>

      <ActionDialog description="Beampipe derives the safe resume point from the terminal ledger. The rationale is retained in the provenance stream." onOpenChange={(open) => setDialog(open ? "retry" : null)} open={dialog === "retry"} title="Retry execution">
        <label className="block"><span className="mb-2 block text-[10px] uppercase text-[var(--bp-subtle)]">Recovery rationale</span><textarea className="min-h-24 w-full resize-y border border-[var(--bp-border)] bg-black p-2 text-xs leading-5 placeholder:text-[var(--bp-subtle)]" onChange={(event) => setReason(event.target.value)} placeholder="Reason for operator recovery..." value={reason} /></label>
        <DialogFooter busy={operation.isPending} confirm="Queue retry" disabled={reason.trim().length < 8} onCancel={() => setDialog(null)} onConfirm={() => operation.mutate("retry")} tone="caution" />
      </ActionDialog>

      <ActionDialog description="Beampipe will request cancellation from the pinned REST or Slurm backend and only lock the ledger after the external system confirms it." onOpenChange={(open) => setDialog(open ? "cancel" : null)} open={dialog === "cancel"} title="Cancel execution">
        <DialogFooter busy={operation.isPending} confirm="Cancel run" onCancel={() => setDialog(null)} onConfirm={() => operation.mutate("cancel")} tone="negative" />
      </ActionDialog>
    </>
  );
}

function DialogFooter({ busy, confirm, disabled, onCancel, onConfirm, tone = "positive" }: { busy: boolean; confirm: string; disabled?: boolean; onCancel: () => void; onConfirm: () => void; tone?: "positive" | "caution" | "negative" }) {
  return <div className="mt-4 flex justify-end gap-2"><button className="h-8 border border-[var(--bp-border)] px-3 text-[10px] uppercase text-[var(--bp-muted)] hover:text-[var(--bp-text)]" onClick={onCancel} type="button">Back</button><button className={tone === "negative" ? "h-8 border border-[var(--bp-red)] px-3 text-[10px] uppercase text-[var(--bp-red)] disabled:opacity-40" : tone === "caution" ? "h-8 border border-[var(--bp-amber)] px-3 text-[10px] uppercase text-[var(--bp-amber)] disabled:opacity-40" : "h-8 border border-[var(--bp-green)] px-3 text-[10px] uppercase text-[var(--bp-green)] disabled:opacity-40"} disabled={busy || disabled} onClick={onConfirm} type="button">{busy ? "Working..." : confirm}</button></div>;
}
