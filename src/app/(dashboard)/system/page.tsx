import { PageHeader } from "@/shared/components/page-header";
import { SystemView } from "@/features/monitoring/system-view";

export default function SystemPage() {
  return <><PageHeader index="08" title="System" description="Readiness, diagnostics, scheduler, TAP, DALiuGE, and security posture." /><SystemView /></>;
}
