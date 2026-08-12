import { PageHeader } from "@/shared/components/page-header";
import { ProfilesView } from "@/features/profiles/profiles-view";

export default function ProfilesPage() {
  return <><PageHeader index="06" title="Deployment profiles" description="Versioned REST and Slurm execution policy." /><ProfilesView /></>;
}
