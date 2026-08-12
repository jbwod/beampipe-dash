import { JobsView } from "@/features/monitoring/jobs-view";
import { PageHeader } from "@/shared/components/page-header";

export default function JobsPage() {
  return <><PageHeader index="03" title="Jobs" description="Queued, leased, delayed, and scheduler-backed durable work." /><JobsView /></>;
}
