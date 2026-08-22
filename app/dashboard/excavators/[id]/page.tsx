import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBlocks } from "@/src/features/blocks/actions";
import { MovementForm } from "@/src/features/excavators/components/movement-form";
import { getExcavator } from "@/src/features/excavators/service";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

type ExcavatorDetailPageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function ExcavatorDetailPage({ params }: ExcavatorDetailPageProps) {
  const { id } = await params;
  const session = await requirePermission(PERMISSIONS.EXCAVATOR_READ);
  const result = await getExcavator(id);
  if (!result) notFound();
  const canManage = await hasPermission(session.user.id, PERMISSIONS.EXCAVATOR_MANAGE);
  const blocks = await getBlocks();
  const blockName = new Map(blocks.map((block) => [block.id, `${block.code} · ${block.name}`]));

  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Excavator", href: "/dashboard/excavators" }, { label: result.item.unitCode }]} description={`${result.item.brand} · ${result.item.model}`} eyebrow="Detail excavator" title={result.item.unitCode} actions={<StatusBadge status={result.item.status} />} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Info label="Operator" value={result.item.operatorName ?? "Belum ditetapkan"} /><Info label="Blok saat ini" value={result.item.currentBlockId ? blockName.get(result.item.currentBlockId) ?? "Blok terkait" : "Belum ditetapkan"} /><Info label="Tanggal masuk" value={result.item.currentEntryDate ?? "Belum dicatat"} /><Info label="Keluar terakhir" value={result.item.lastExitDate ?? "Belum dicatat"} /></div><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Riwayat perpindahan</CardTitle></CardHeader><CardContent>{result.movements.length ? <div className="divide-y divide-border">{result.movements.map((movement) => <article className="py-4 first:pt-0 last:pb-0" key={movement.id}><div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status={movement.movementType} label={movement.movementType} /><time className="text-xs text-muted-foreground" dateTime={movement.occurredAt.toISOString()}>{movement.occurredAt.toLocaleDateString("id-ID")}</time></div><p className="mt-3 text-sm">{movement.movementType === "EXIT" ? `Keluar dari ${blockName.get(movement.fromBlockId ?? "") ?? "blok saat ini"}` : `${movement.movementType === "ENTRY" ? "Masuk ke" : "Dipindahkan ke"} ${blockName.get(movement.toBlockId ?? "") ?? "blok tujuan"}`}</p>{movement.notes ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{movement.notes}</p> : null}</article>)}</div> : <EmptyState description="Riwayat perpindahan unit akan muncul setelah ada pencatatan." title="Belum ada riwayat perpindahan" />}</CardContent></Card>{canManage ? <MovementForm blocks={blocks.map((block) => ({ id: block.id, code: block.code, name: block.name }))} currentBlockId={result.item.currentBlockId} excavatorId={result.item.id} /> : null}</div></div></PageContainer>;
}

function Info({ label, value }: { label: string; value: string }) { return <Card className="shadow-sm"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 text-sm font-medium">{value}</p></CardContent></Card>; }
