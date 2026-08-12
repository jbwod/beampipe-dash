import { Suspense } from "react";
import { ProjectStudio } from "@/features/projects/project-studio";
import { PageHeader } from "@/shared/components/page-header";

export default function NewProjectPage() {
  return <><PageHeader index="05A" title="Project studio" description="Visual survey policy and canonical YAML for discovery, metadata, graph preparation, and execution." /><Suspense fallback={<div className="grid min-h-72 place-items-center text-xs text-[var(--bp-muted)]">[ loading project studio ]</div>}><ProjectStudio /></Suspense></>;
}
