import { ServerCog } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";

export default function ProfilesPage() {
  return <><PageHeader index="06" title="Deployment profiles" description="Versioned REST and Slurm execution policy." /><div className="p-4 sm:p-6"><EmptyState icon={ServerCog} title="Profile manager pending" detail="Typed REST and Slurm forms land in the deployment profile slice." /></div></>;
}
