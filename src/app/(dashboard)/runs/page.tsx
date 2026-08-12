import { Activity } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";

export default function RunsPage() {
  return <><PageHeader index="02" title="Runs" description="Active and historical executions." /><div className="p-4 sm:p-6"><EmptyState icon={Activity} title="Run index pending" detail="Execution monitoring lands in the next feature slice." /></div></>;
}
