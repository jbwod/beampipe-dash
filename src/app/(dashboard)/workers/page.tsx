import { WorkersView } from "@/features/monitoring/workers-view";
import { PageHeader } from "@/shared/components/page-header";

export default function WorkersPage() {
  return <><PageHeader index="07" title="Workers" description="Capabilities, heartbeats, pools, leases, and controlled drain state." /><WorkersView /></>;
}
