import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/page-container";
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

  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Pemeriksaan", href: "/dashboard/inspections" }, { label: block?.code ?? "Pemeriksaan" }]} description={block ? `${block.code} · ${block.name}` : "Observasi lapangan"} eyebrow="Detail pemeriksaan" title={result.item.inspectedAt.toLocaleDateString("id-ID")} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Info label="Kondisi" value={result.item.condition} /><Info label="Excavator terpantau" value={String(result.item.excavatorCount)} /><Info label="Pekerja terpantau" value={String(result.item.workerCount)} /><Info label="Akurasi GPS" value={`±${result.item.gpsAccuracy} m`} /></div><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Observasi</CardTitle></CardHeader><CardContent className="space-y-6"><Field label="Temuan" value={result.item.findings} /><Field label="Catatan" value={result.item.notes} /><div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Koordinat</p><p className="mt-2 text-sm">{result.item.latitude}, {result.item.longitude}</p><a className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-wider underline underline-offset-4" href={`https://www.google.com/maps?q=${result.item.latitude},${result.item.longitude}`} rel="noreferrer" target="_blank">Buka peta</a></div></CardContent></Card><Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Foto</CardTitle></CardHeader><CardContent><InspectionPhotoList inspectionId={result.item.id} photos={result.photos} /></CardContent></Card></div></div></PageContainer>;
}

function Info({ label, value }: { label: string; value: string }) { return <Card className="shadow-sm"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 truncate text-sm font-medium">{value}</p></CardContent></Card>; }
function Field({ label, value }: { label: string; value: string | null }) { return <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{value || "Not recorded"}</p></div>; }
