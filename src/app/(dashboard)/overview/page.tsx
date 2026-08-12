import { PageHeader } from "@/shared/components/page-header";
import { OverviewView } from "@/features/monitoring/overview-view";

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        index="01"
        title="Operator overview"
        description="Health, durable work, archive readiness, and execution outcomes at a glance."
      />
      <OverviewView />
    </>
  );
}
