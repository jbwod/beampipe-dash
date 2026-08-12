import { SourcesView } from "@/features/monitoring/sources-view";
import { PageHeader } from "@/shared/components/page-header";

export default function SourcesPage() {
  return <><PageHeader index="04" title="Sources" description="Registry, discovery freshness, workflow admission, and execution readiness." /><SourcesView /></>;
}
