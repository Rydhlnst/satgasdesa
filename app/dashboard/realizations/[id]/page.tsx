import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/page-container";
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
      <div className="space-y-6"><Card><CardHeader><CardTitle>Evidence</CardTitle></CardHeader><CardContent className="space-y-5">{evidence.length ? <EvidenceList entityId={id} items={evidence} kind="realization" /> : <EmptyState description="Attach receipts or supporting documents before final approval." title="No evidence attached" />}{canCreate && !["SAH", "REJECTED"].includes(result.realization.status) ? <EvidenceUploader entityId={id} kind="realization" /> : null}</CardContent></Card><Card><CardHeader><CardTitle>Approval history</CardTitle></CardHeader><CardContent>{result.approvals.length ? <div className="divide-y divide-border">{result.approvals.map((approval) => <div className="py-3 first:pt-0 last:pb-0" key={approval.id}><div className="flex justify-between gap-3"><StatusBadge status={approval.action} /><span className="text-xs text-muted-foreground">{approval.createdAt.toLocaleString("en-GB")}</span></div>{approval.notes ? <p className="mt-2 text-sm text-muted-foreground">{approval.notes}</p> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">No workflow action recorded.</p>}</CardContent></Card></div>
      <div className="space-y-5">{transitions.length && (canCreate || canVerify || canApprove) ? <Card><CardHeader><CardTitle>Workflow action</CardTitle></CardHeader><CardContent><form action={transitionRealizationAction} className="space-y-3"><input name="id" type="hidden" value={id} /><select className="h-10 w-full border-b border-input bg-transparent" name="status">{transitions.map((status) => <option key={status} value={status}>{status}</option>)}</select><textarea className="min-h-24 w-full border border-input bg-transparent p-3 text-sm" name="notes" placeholder="Notes or rejection reason" required={transitions.some((status) => status === "REJECTED")} /><Button type="submit">Apply transition</Button></form></CardContent></Card> : null}{canCreate && result.realization.status === "SAH" ? <Card><CardHeader><CardTitle>Correction request</CardTitle></CardHeader><CardContent><form action={correctRealizationAction} className="space-y-3"><input name="id" type="hidden" value={id} /><input className="h-10 w-full border-b border-input bg-transparent" name="requestedAmount" placeholder="Corrected amount" type="number" min="1" required /><textarea className="min-h-20 w-full border border-input bg-transparent p-3 text-sm" name="description" placeholder="Corrected description" required /><textarea className="min-h-20 w-full border border-input bg-transparent p-3 text-sm" name="reason" placeholder="Correction reason" required /><Button type="submit" variant="outline">Create correction</Button></form></CardContent></Card> : null}{canApprove && result.realization.status === "SAH" ? <Card><CardHeader><CardTitle>Reverse realization</CardTitle></CardHeader><CardContent><form action={reverseRealizationAction} className="space-y-3"><input name="id" type="hidden" value={id} /><textarea className="min-h-20 w-full border border-input bg-transparent p-3 text-sm" name="reason" placeholder="Reversal reason" required /><Button type="submit" variant="destructive">Reverse realization</Button></form></CardContent></Card> : null}</div>
    </div>
  </div></PageContainer>;
}

function Info({ label, value }: { label: string; value: ReactNode }) { return <Card className="shadow-sm"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-3 text-sm font-semibold">{value}</p></CardContent></Card>; }
