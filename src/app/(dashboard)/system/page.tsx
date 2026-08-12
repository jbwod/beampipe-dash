import { Database } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";

export default function SystemPage() {
  return <><PageHeader index="08" title="System" description="Readiness, diagnostics, scheduler, TAP, and DALiuGE topology." /><div className="p-4 sm:p-6"><EmptyState icon={Database} title="System diagnostics pending" detail="Runtime diagnostics land in the monitoring feature slice." /></div></>;
}
