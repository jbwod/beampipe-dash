"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

export function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/80 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[520px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 border border-[var(--bp-border)] bg-[var(--bp-panel)] p-4 text-[var(--bp-text)] shadow-[8px_8px_0_#000] data-ending-style:opacity-0 data-starting-style:opacity-0">
          <div className="mb-4 flex items-start gap-4 border-b border-[var(--bp-border-soft)] pb-4">
            <div className="min-w-0 flex-1"><Dialog.Title className="text-sm font-semibold">[ {title} ]</Dialog.Title><Dialog.Description className="mt-2 text-xs leading-5 text-[var(--bp-muted)]">{description}</Dialog.Description></div>
            <Dialog.Close aria-label="Close" className="grid size-7 place-items-center text-[var(--bp-muted)] hover:text-[var(--bp-text)]"><X className="size-4" /></Dialog.Close>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
