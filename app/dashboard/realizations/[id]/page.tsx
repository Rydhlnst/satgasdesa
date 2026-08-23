import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/page-container";
import { ActionForm } from "@/components/shared/action-form";
import { ConfirmActionForm } from "@/components/shared/confirm-action-form";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceList } from "@/src/features/evidence/components/evidence-list";
import { EvidenceUploader } from "@/src/features/evidence/components/evidence-uploader";
import { getRealizationEvidence } from "@/src/features/evidence/service";
import { REALIZATION_TRANSITIONS } from "@/src/features/budgets/constants";
import { getRealizationDetail } from "@/src/features/budgets/service";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

import { correctRealizationAction, reverseRealizationAction, transitionRealizationAction } from "../_actions";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export default async function RealizationDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requirePermission(PERMISSIONS.REALIZATION_READ);
  let result;
  try { result = await getRealizationDetail(id); } catch { notFound(); }
  const [evidence, canCreate, canVerify, canApprove] = await Promise.all([
    getRealizationEvidence(id),
    hasPermission(session.user.id, PERMISSIONS.REALIZATION_CREATE),
    hasPermission(session.user.id, PERMISSIONS.REALIZATION_VERIFY),
    hasPermission(session.user.id, PERMISSIONS.REALIZATION_APPROVE),
  ]);
  const transitions = REALIZATION_TRANSITIONS[result.realization.status as keyof typeof REALIZATION_TRANSITIONS] ?? [];

  return <PageContainer><div className="space-y-8">
    <PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Realizations", href: "/dashboard/realizations" }, { label: id }]} description={`${result.period.periodKey} · ${result.group.name} · ${result.budgetItem.name}`} eyebrow="Realization detail" title={result.realization.description} actions={<div className="flex flex-wrap gap-2"><StatusBadge status={result.realization.status} />{result.realization.isOverAllocation === 1 ? <StatusBadge status="URGENT" label="Over allocation" /> : null}</div>} />
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Info label="Requested" value={<MoneyDisplay value={result.realization.requestedAmount} />} /><Info label="Allocation" value={<MoneyDisplay value={result.calculation.allocation} />} /><Info label="Committed" value={<MoneyDisplay value={result.calculation.committedRealization} />} /><Info label="Remaining" value={<MoneyDisplay value={result.calculation.remainingAllocation} />} /></section>
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6"><Card><CardHeader><CardTitle>Evidence</CardTitle></CardHeader><CardContent className="space-y-5"><EvidenceList entityId={id} items={evidence} kind="realization" />{canCreate && !["SAH", "REJECTED"].includes(result.realization.status) ? <EvidenceUploader entityId={id} kind="realization" /> : null}</CardContent></Card><Card><CardHeader><CardTitle>Riwayat persetujuan</CardTitle></CardHeader><CardContent>{result.approvals.length ? <div className="divide-y divide-border">{result.approvals.map((approval) => <div className="py-3 first:pt-0 last:pb-0" key={approval.id}><div className="flex justify-between gap-3"><StatusBadge status={approval.action} /><span className="text-xs text-muted-foreground">{approval.createdAt.toLocaleString("id-ID")}</span></div>{approval.notes ? <p className="mt-2 text-sm text-muted-foreground">{approval.notes}</p> : null}</div>)}</div> : <EmptyState description="Perubahan status pada alur ini akan muncul setelah ada tindakan." title="Belum ada riwayat persetujuan" variant="inline" />}</CardContent></Card></div>
      <div className="space-y-5">{transitions.length && (canCreate || canVerify || canApprove) ? <Card><CardHeader><CardTitle>Tindakan alur</CardTitle></CardHeader><CardContent><ActionForm action={transitionRealizationAction} className="space-y-3"><input name="id" type="hidden" value={id} /><select className="h-10 w-full border-b border-input bg-transparent" name="status">{transitions.map((status) => <option key={status} value={status}>{status}</option>)}</select><textarea className="min-h-24 w-full border border-input bg-transparent p-3 text-sm" name="notes" placeholder="Catatan atau alasan penolakan" required={transitions.some((status) => status === "REJECTED")} /><Button className="min-h-11" type="submit">Terapkan perubahan</Button></ActionForm></CardContent></Card> : null}{canCreate && result.realization.status === "SAH" ? <Card><CardHeader><CardTitle>Permintaan koreksi</CardTitle></CardHeader><CardContent><ActionForm action={correctRealizationAction} className="space-y-3"><input name="id" type="hidden" value={id} /><input className="h-10 w-full border-b border-input bg-transparent" name="requestedAmount" placeholder="Jumlah koreksi" type="number" min="1" required /><textarea className="min-h-20 w-full border border-input bg-transparent p-3 text-sm" name="description" placeholder="Uraian koreksi" required /><textarea className="min-h-20 w-full border border-input bg-transparent p-3 text-sm" name="reason" placeholder="Alasan koreksi" required /><Button className="min-h-11" type="submit" variant="outline">Buat koreksi</Button></ActionForm></CardContent></Card> : null}{canApprove && result.realization.status === "SAH" ? <Card><CardHeader><CardTitle>Balik realisasi</CardTitle></CardHeader><CardContent><ConfirmActionForm action={reverseRealizationAction} className="space-y-3" confirmDescription="Realisasi yang sudah sah akan dibalik melalui catatan koreksi dan tetap tercatat di audit log." confirmTitle="Balik realisasi ini?" confirmActionLabel="Balik realisasi"><input name="id" type="hidden" value={id} /><textarea className="min-h-20 w-full border border-input bg-transparent p-3 text-sm" name="reason" placeholder="Alasan pembalikan" required /><Button className="min-h-11" type="submit" variant="destructive">Balik realisasi</Button></ConfirmActionForm></CardContent></Card> : null}</div>
    </div>
  </div></PageContainer>;
}

function Info({ label, value }: { label: string; value: ReactNode }) { return <Card className="shadow-sm"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-3 text-sm font-semibold">{value}</p></CardContent></Card>; }
