import { UsersRound } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";

export default function UsersPage() {
  return <><PageHeader index="09" title="Users" description="Administrative access to the Beampipe control plane." /><div className="p-4 sm:p-6"><EmptyState icon={UsersRound} title="User administration pending" detail="User management will follow the core operator workflows." /></div></>;
}
