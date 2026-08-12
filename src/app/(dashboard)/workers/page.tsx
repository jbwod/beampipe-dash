import { Boxes } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";

export default function WorkersPage() {
  return <><PageHeader index="07" title="Workers" description="Capabilities, heartbeats, pools, leases, and drain state." /><div className="p-4 sm:p-6"><EmptyState icon={Boxes} title="Worker monitor pending" detail="Worker telemetry lands in the monitoring feature slice." /></div></>;
}
