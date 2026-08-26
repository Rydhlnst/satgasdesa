import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { BlockForm } from "@/src/features/blocks/components/block-form";
import { getBlock, updateBlock } from "@/src/features/blocks/actions";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

export const dynamic = "force-dynamic";

type BlockEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BlockEditPage({ params }: BlockEditPageProps) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.BLOCK_UPDATE);
  const item = await getBlock(id);
  if (!item) notFound();

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-8">
        <PageHeader actions={<Button asChild variant="outline" size="sm"><Link href={`/dashboard/blocks/${item.id}`}>Kembali ke blok</Link></Button>} breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Monitoring blok", href: "/dashboard/blocks" }, { label: item.code, href: `/dashboard/blocks/${item.id}` }, { label: "Edit" }]} description="Perbarui identitas, lokasi, penanggung jawab, dan kondisi operasional blok." eyebrow="Edit blok" title={item.code} />
        <BlockForm
          action={updateBlock}
          submitLabel="Save block"
          initial={{
            id: item.id,
            code: item.code,
            name: item.name,
            status: item.status,
            latitude: item.latitude,
            longitude: item.longitude,
            locationPhotoKey: item.locationPhotoKey,
            managerName: item.managerName,
            locationPicName: item.locationPicName,
            fieldPicName: item.fieldPicName,
            contact: item.contact,
            areaHectares: item.areaHectares,
            priority: item.priority,
            workerCount: item.workerCount,
            operationalCondition: item.operationalCondition,
            startDate: item.startDate,
            notes: item.notes,
          }}
        />
      </div>
    </PageContainer>
  );
}
