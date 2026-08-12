import { PageHeader } from "@/shared/components/page-header";
import { RunsView } from "@/features/monitoring/runs-view";

export default function RunsPage() {
  return <><PageHeader index="02" title="Runs" description="Active and historical executions across REST and Slurm backends." /><RunsView /></>;
}
