import Link from "next/link";

import { PageContainer } from "@/components/app-shell/page-container";
import { ExcavatorForm } from "@/src/features/excavators/components/excavator-form";
import { PageHeader } from "@/components/shared/page-header";
import { getBlocks } from "@/src/features/blocks/actions";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewExcavatorPage() {
  await requirePermission(PERMISSIONS.EXCAVATOR_MANAGE);
  const blocks = await getBlocks();

  return <PageContainer><div className="space-y-8"><PageHeader actions={<Button asChild variant="outline"><Link href="/dashboard/excavators">Back to excavators</Link></Button>} breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Excavators", href: "/dashboard/excavators" }, { label: "Register" }]} description="Create the unit record first. Movement history is recorded separately from metadata." eyebrow="Operational core" title="Register excavator" /><ExcavatorForm blocks={blocks.map((block) => ({ id: block.id, code: block.code, name: block.name }))} /></div></PageContainer>;
}
