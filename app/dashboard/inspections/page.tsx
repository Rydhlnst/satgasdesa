import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { PageContainer } from "@/components/app-shell/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getBlocks } from "@/src/features/blocks/actions";
import { getInspections } from "@/src/features/inspections/service";
import { MobileInspectionList } from "../_components/mobile-operational-screens";

export const dynamic = "force-dynamic";

type InspectionsPageProps = { searchParams: Promise<{ blockId?: string }> };

function validUuid(value: string | undefined): string | undefined {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
}

export default async function InspectionsPage({ searchParams }: InspectionsPageProps) {
  const params = await searchParams;
  const session = await requirePermission(PERMISSIONS.INSPECTION_READ);
  const canCreate = await hasPermission(session.user.id, PERMISSIONS.INSPECTION_CREATE);
  const blockId = validUuid(params.blockId);
  const [items, blocks] = await Promise.all([getInspections(blockId), getBlocks()]);

  return <PageContainer><div className="space-y-8"><PageHeader actions={canCreate ? <Button asChild><Link href="/dashboard/inspections/new">New inspection</Link></Button> : undefined} breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Pemeriksaan" }]} description="Review field observations, GPS capture, staffing, and excavator counts by block." eyebrow="Operational core" title="Inspections" /><form className="hidden flex-col gap-3 border-y border-border py-4 sm:flex-row md:flex" method="get"><select aria-label="Filter by block" className="h-10 border-b border-input bg-transparent px-0 text-sm sm:w-72" defaultValue={params.blockId ?? ""} name="blockId"><option value="">All blocks</option>{blocks.map((block) => <option key={block.id} value={block.id}>{block.code} · {block.name}</option>)}</select><Button type="submit" variant="outline">Filter</Button></form>{items.length === 0 ? <section className="hidden rounded-xl border border-border bg-card shadow-sm md:block"><EmptyState description="Create the first field inspection or adjust the block filter." icon={ClipboardCheck} title="No inspections found" /></section> : <section className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground"><tr><th className="px-5 py-4 font-semibold">Block</th><th className="px-5 py-4 font-semibold">Inspected</th><th className="px-5 py-4 font-semibold">Condition</th><th className="px-5 py-4 font-semibold">Observed</th><th className="px-5 py-4 text-right font-semibold">Action</th></tr></thead><tbody className="divide-y divide-border">{items.map((item) => <tr key={item.id}><td className="px-5 py-5"><p className="font-semibold">{item.blockCode}</p><p className="mt-1 text-xs text-muted-foreground">{item.blockName}</p></td><td className="px-5 py-5 text-sm text-muted-foreground">{item.inspectedAt.toLocaleDateString("en-GB")}</td><td className="max-w-xs px-5 py-5"><p className="truncate">{item.condition}</p></td><td className="px-5 py-5 text-sm">{item.excavatorCount} excavators · {item.workerCount} workers</td><td className="px-5 py-5 text-right"><Button asChild size="xs" variant="ghost"><Link href={`/dashboard/inspections/${item.id}`}>Open</Link></Button></td></tr>)}</tbody></table></section>}<MobileInspectionList canCreate={canCreate} items={items.map((item) => ({ id: item.id, blockCode: item.blockCode, blockName: item.blockName, inspectedAt: item.inspectedAt, condition: item.condition, excavatorCount: item.excavatorCount, workerCount: item.workerCount }))} /></div></PageContainer>;
}
