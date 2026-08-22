import Link from "next/link";

import { PageContainer } from "@/components/app-shell/page-container";
import { Button } from "@/components/ui/button";
import { DailyInformationForm } from "@/src/features/daily-information/components/daily-information-form";
import { getBlocks } from "@/src/features/blocks/actions";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

export const dynamic = "force-dynamic";

export default async function NewInformationPage() { await requirePermission(PERMISSIONS.DAILY_INFO_CREATE); const blocks = await getBlocks(); return <PageContainer><div className="space-y-8"><header><Button asChild className="-ml-3 mb-4" variant="ghost"><Link href="/dashboard/information">Back to information</Link></Button><p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Operational core</p><h1 className="mt-2 font-heading text-2xl font-semibold leading-tight uppercase tracking-wide sm:text-3xl">New daily information</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">New records begin in the NEW state and move through the defined workflow.</p></header><DailyInformationForm blocks={blocks.map((block) => ({ id: block.id, code: block.code, name: block.name }))} /></div></PageContainer>; }
