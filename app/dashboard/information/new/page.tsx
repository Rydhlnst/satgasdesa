import Link from "next/link";

import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DailyInformationForm } from "@/src/features/daily-information/components/daily-information-form";
import { getBlocks } from "@/src/features/blocks/actions";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

export const dynamic = "force-dynamic";

export default async function NewInformationPage() { await requirePermission(PERMISSIONS.DAILY_INFO_CREATE); const blocks = await getBlocks(); return <PageContainer><div className="space-y-8"><PageHeader actions={<Button asChild variant="outline"><Link href="/dashboard/information">Kembali ke informasi</Link></Button>} breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Informasi harian", href: "/dashboard/information" }, { label: "Baru" }]} description="Buat informasi baru yang akan mengikuti alur status dan tindak lanjut yang ditentukan." eyebrow="Operasional inti" title="Informasi harian baru" /><DailyInformationForm blocks={blocks.map((block) => ({ id: block.id, code: block.code, name: block.name }))} /></div></PageContainer>; }
