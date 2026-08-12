import { PageHeader } from "@/shared/components/page-header";
import { SourceExplorer } from "@/features/sources/source-explorer";

export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><PageHeader index="04A" title="Source explorer" description="Readiness, archive metadata, linked runs, provenance, and registry policy." /><SourceExplorer id={id} /></>;
}
