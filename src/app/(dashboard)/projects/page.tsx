import { Braces } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";

export default function ProjectsPage() {
  return <><PageHeader index="05" title="Projects" description="Active survey policy and immutable configuration revisions." actions={<Link className="border border-[var(--bp-cyan)] px-3 py-2 text-xs text-[var(--bp-cyan)]" href="/projects/new">New project</Link>} /><div className="p-4 sm:p-6"><EmptyState icon={Braces} title="Project registry pending" detail="The visual and YAML project studio lands in its own feature slice." /></div></>;
}
