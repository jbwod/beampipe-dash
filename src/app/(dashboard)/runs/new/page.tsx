import { Suspense } from "react";
import { RunComposer } from "@/features/runs/run-composer";
import { PageHeader } from "@/shared/components/page-header";

export default function NewRunPage() {
  return <><PageHeader index="02A" title="Compose run" description="Validate source metadata, pin an execution profile, and submit one or many sources." /><Suspense fallback={<div className="p-6 text-xs text-[var(--bp-muted)]">[ loading execution composer ]</div>}><RunComposer /></Suspense></>;
}
