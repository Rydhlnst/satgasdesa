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

  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Excavators", href: "/dashboard/excavators" }, { label: result.item.unitCode }]} description={`${result.item.brand} · ${result.item.model}`} eyebrow="Excavator detail" title={result.item.unitCode} actions={<StatusBadge status={result.item.status} />} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Info label="Operator" value={result.item.operatorName ?? "Not assigned"} /><Info label="Current block" value={result.item.currentBlockId ? blockName.get(result.item.currentBlockId) ?? "Assigned block" : "Not assigned"} /><Info label="Entry date" value={result.item.currentEntryDate ?? "Not recorded"} /><Info label="Last exit" value={result.item.lastExitDate ?? "Not recorded"} /></div><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Movement history</CardTitle></CardHeader><CardContent>{result.movements.length ? <div className="divide-y divide-border">{result.movements.map((movement) => <article className="py-4 first:pt-0 last:pb-0" key={movement.id}><div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status={movement.movementType} label={movement.movementType} /><time className="text-xs text-muted-foreground" dateTime={movement.occurredAt.toISOString()}>{movement.occurredAt.toLocaleDateString("en-GB")}</time></div><p className="mt-3 text-sm">{movement.movementType === "EXIT" ? `Exited ${blockName.get(movement.fromBlockId ?? "") ?? "current block"}` : `${movement.movementType === "ENTRY" ? "Entered" : "Transferred to"} ${blockName.get(movement.toBlockId ?? "") ?? "destination block"}`}</p>{movement.notes ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{movement.notes}</p> : null}</article>)}</div> : <EmptyState description="No movement has been recorded for this unit." title="No movement history" />}</CardContent></Card>{canManage ? <MovementForm blocks={blocks.map((block) => ({ id: block.id, code: block.code, name: block.name }))} currentBlockId={result.item.currentBlockId} excavatorId={result.item.id} /> : null}</div></div></PageContainer>;
}

function Info({ label, value }: { label: string; value: string }) { return <Card className="shadow-sm"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 text-sm font-medium">{value}</p></CardContent></Card>; }
