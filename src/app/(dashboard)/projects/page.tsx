import { PageHeader } from "@/shared/components/page-header";
import { ProjectsView } from "@/features/monitoring/projects-view";

export default function ProjectsPage() {
  return <><PageHeader index="05" title="Projects" description="Active survey policy, contract health, and immutable configuration revisions." /><ProjectsView /></>;
}
