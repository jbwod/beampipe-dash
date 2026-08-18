import { PageHeader } from "@/shared/components/page-header";
import { AlertsView } from "@/features/alerts/alerts-view";

export default function AlertsPage() {
  return (
    <>
      <PageHeader
        index="06A"
        title="Alerts"
        description="Webhook and email channels, trigger rules, test sends, and redacted delivery history."
      />
      <AlertsView />
    </>
  );
}
