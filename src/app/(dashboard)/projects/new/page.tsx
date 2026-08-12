import { Braces } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";

export default function NewProjectPage() {
  return <><PageHeader index="05A" title="New project" description="Build project-defined discovery and execution policy." /><div className="p-4 sm:p-6"><EmptyState icon={Braces} title="Project studio pending" detail="The split visual and YAML editor will be implemented after run operations." /></div></>;
}
