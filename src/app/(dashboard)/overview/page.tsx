import { Activity } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        index="01"
        title="Operator overview"
        description="Health, durable work, archive readiness, and execution outcomes at a glance."
      />
      <div className="p-4 sm:p-6">
        <EmptyState
          detail="The connection is ready. Live control-plane metrics arrive in the monitoring feature commit."
          icon={Activity}
          title="Waiting for telemetry"
        />
      </div>
    </>
  );
}
