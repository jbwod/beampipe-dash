import { RadioTower } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";

export default function SourcesPage() {
  return <><PageHeader index="04" title="Sources" description="Registry, discovery readiness, metadata, and execution links." /><div className="p-4 sm:p-6"><EmptyState icon={RadioTower} title="Source registry pending" detail="Registration and discovery controls land in the workflow feature slice." /></div></>;
}
