import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InspectionPhotoList } from "@/src/features/inspections/components/photo-list";
import { getInspection } from "@/src/features/inspections/service";
import { getBlock } from "@/src/features/blocks/actions";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

type InspectionDetailPageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function InspectionDetailPage({ params }: InspectionDetailPageProps) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.INSPECTION_READ);
  const result = await getInspection(id);
  if (!result) notFound();
  const block = await getBlock(result.item.blockId);

  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inspections", href: "/dashboard/inspections" }, { label: block?.code ?? "Inspection" }]} description={block ? `${block.code} · ${block.name}` : "Field observation"} eyebrow="Inspection detail" title={result.item.inspectedAt.toLocaleDateString("en-GB")} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Info label="Condition" value={result.item.condition} /><Info label="Observed excavators" value={String(result.item.excavatorCount)} /><Info label="Observed workers" value={String(result.item.workerCount)} /><Info label="GPS accuracy" value={`±${result.item.gpsAccuracy} m`} /></div><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Observation</CardTitle></CardHeader><CardContent className="space-y-6"><Field label="Findings" value={result.item.findings} /><Field label="Notes" value={result.item.notes} /><div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Coordinates</p><p className="mt-2 text-sm">{result.item.latitude}, {result.item.longitude}</p><a className="mt-2 inline-block text-xs font-semibold uppercase tracking-wider underline underline-offset-4" href={`https://www.google.com/maps?q=${result.item.latitude},${result.item.longitude}`} rel="noreferrer" target="_blank">Open map</a></div></CardContent></Card><Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Photos</CardTitle></CardHeader><CardContent>{result.photos.length ? <InspectionPhotoList inspectionId={result.item.id} photos={result.photos} /> : <EmptyState description="No photos were attached to this inspection." title="No photos" />}</CardContent></Card></div></div></PageContainer>;
}

function Info({ label, value }: { label: string; value: string }) { return <Card className="shadow-sm"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 truncate text-sm font-medium">{value}</p></CardContent></Card>; }
function Field({ label, value }: { label: string; value: string | null }) { return <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{value || "Not recorded"}</p></div>; }
