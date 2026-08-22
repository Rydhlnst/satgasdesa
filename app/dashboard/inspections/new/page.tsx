import Link from "next/link";

import { PageContainer } from "@/components/app-shell/page-container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getBlocks } from "@/src/features/blocks/actions";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { InspectionFormClient } from "./_components/inspection-form-client";

export const dynamic = "force-dynamic";

export default async function NewInspectionPage() {
  await requirePermission(PERMISSIONS.INSPECTION_CREATE);
  const blocks = await getBlocks();
  return <PageContainer><div className="space-y-8"><PageHeader actions={<Button asChild variant="outline"><Link href="/dashboard/inspections">Back to inspections</Link></Button>} breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inspections", href: "/dashboard/inspections" }, { label: "New" }]} description="Capture a point-in-time field observation with GPS and up to three photos." eyebrow="Operational core" title="New inspection" />{blocks.length ? <InspectionFormClient blocks={blocks.map((block) => ({ id: block.id, code: block.code, name: block.name }))} /> : <section className="rounded-xl border border-border bg-card shadow-sm"><EmptyState description="Create a block before recording an inspection." title="No blocks available" action={<Button asChild variant="outline"><Link href="/dashboard/blocks">Open blocks</Link></Button>} /></section>}</div></PageContainer>;
}
