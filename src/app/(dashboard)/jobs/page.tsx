import { Workflow } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";

export default function JobsPage() {
  return <><PageHeader index="03" title="Jobs" description="Queued, leased, delayed, and failed durable work." /><div className="p-4 sm:p-6"><EmptyState icon={Workflow} title="Job monitor pending" detail="Live job polling lands in the monitoring feature slice." /></div></>;
}
