import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { PageContainer } from "@/components/app-shell/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requirePermission(PERMISSIONS.REPORT_READ);
  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }]} description="Generate period-based operational, financial, and budget recaps from backend service results." eyebrow="Management" title="Reports" /><section className="rounded-xl border border-border bg-card shadow-sm"><EmptyState description="Choose a month to review operational counts, cash movement, receivables, and budget absorption." icon={FileBarChart} title="Monthly reporting" action={<Button asChild><Link href="/dashboard/reports/monthly">Open monthly report</Link></Button>} /></section></div></PageContainer>;
}
