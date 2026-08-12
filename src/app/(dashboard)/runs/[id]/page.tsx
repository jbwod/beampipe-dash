import { PageHeader } from "@/shared/components/page-header";
import { RunStatusPreview } from "@/features/monitoring/run-status-preview";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><PageHeader index="02" title={`Run ${id.slice(0, 8)}`} description="Execution state and backend reconciliation." /><RunStatusPreview id={id} /></>;
}
