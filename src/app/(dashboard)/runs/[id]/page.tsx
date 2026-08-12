import { PageHeader } from "@/shared/components/page-header";
import { RunExplorer } from "@/features/runs/run-explorer";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><PageHeader index="02" title={`Run ${id.slice(0, 8)}`} description="Ledger, provenance, backend evidence, immutable artifacts, and recovery." /><RunExplorer id={id} /></>;
}
