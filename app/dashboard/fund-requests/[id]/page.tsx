import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/page-container";
import { ActionForm } from "@/components/shared/action-form";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FUND_REQUEST_TRANSITIONS } from "@/src/features/fund-requests/constants";
import { permissionForFundRequestTransition } from "@/src/features/fund-requests/policy";
import { getFundRequestDetail } from "@/src/features/fund-requests/service";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { transitionFundRequestAction } from "../_actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function FundRequestDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requirePermission(PERMISSIONS.FUND_REQUEST_READ);
  let result;
  try { result = await getFundRequestDetail(id); } catch { notFound(); }
  const transitions = FUND_REQUEST_TRANSITIONS[result.request.status as keyof typeof FUND_REQUEST_TRANSITIONS] ?? [];
  const actions = (await Promise.all(transitions.map(async (status) => ({ status, allowed: await hasPermission(session.user.id, permissionForFundRequestTransition(result.request.status, status)) })))).filter((item) => item.allowed && (["SUBMITTED", "CANCELLED"].includes(item.status) ? result.request.createdBy === session.user.id : result.request.createdBy !== session.user.id));

  const approvalPercentage = result.approval.requiredCount ? Math.round((result.approval.approvedCount / result.approval.requiredCount) * 100) : 0;
  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Pengajuan Dana", href: "/dashboard/fund-requests" }, { label: result.request.requestNumber }]} description={`${result.period.periodKey} · ${result.category.name}${result.block ? ` · ${result.block.code}` : ""}`} eyebrow="Detail pengajuan" title={result.request.title} actions={<StatusBadge status={result.request.status} />} /><section className="grid gap-4 sm:grid-cols-3"><Info label="Nilai" value={<MoneyDisplay value={result.request.amount} />} /><Info label="Tanggal pengajuan" value={result.request.requestedAt} /><Info label="Kategori" value={result.category.name} /></section><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-6"><Card><CardHeader><CardTitle>Uraian pengajuan</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{result.request.description}</p></CardContent></Card><Card><CardHeader><CardTitle>Lampiran</CardTitle></CardHeader><CardContent>{result.attachments.length ? <div className="divide-y divide-border">{result.attachments.map((attachment) => <article className="py-3 first:pt-0 last:pb-0" key={attachment.id}><p className="text-sm font-medium">{attachment.caption || "Lampiran pendukung"}</p><p className="mt-1 text-xs text-muted-foreground">{attachment.contentType} · {(attachment.sizeBytes / 1024).toFixed(1)} KB</p></article>)}</div> : <EmptyState description="Lampiran pendukung akan tampil di sini." title="Belum ada lampiran" variant="inline" />}</CardContent></Card><Card><CardHeader><CardTitle>Riwayat alur</CardTitle></CardHeader><CardContent>{result.events.length ? <div className="divide-y divide-border">{result.events.map((event) => <article className="py-3 first:pt-0 last:pb-0" key={event.id}><div className="flex items-center justify-between gap-3"><StatusBadge status={event.action} /><time className="text-xs text-muted-foreground">{event.createdAt.toLocaleString("id-ID")}</time></div>{event.notes ? <p className="mt-2 text-sm text-muted-foreground">{event.notes}</p> : null}</article>)}</div> : <EmptyState description="Perubahan status akan dicatat di sini." title="Belum ada riwayat" variant="inline" />}</CardContent></Card></div><div className="space-y-5"><Card><CardHeader><CardTitle>Persetujuan Pimpinan/Admin</CardTitle></CardHeader><CardContent><div className="flex items-end justify-between gap-3"><p className="text-2xl font-semibold">{result.approval.approvedCount}/{result.approval.requiredCount}</p><p className="text-xs text-muted-foreground">{result.approval.isComplete ? "Semua sudah menyetujui" : `${result.approval.remainingCount} persetujuan tersisa`}</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${approvalPercentage}%` }} /></div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Pengajuan hanya menjadi SAH setelah semua Pimpinan/Admin aktif memberikan persetujuan. Bendahara tidak dapat menyetujui pengajuannya sendiri.</p></CardContent></Card>{actions.length ? <Card><CardHeader><CardTitle>Tindakan alur</CardTitle></CardHeader><CardContent><ActionForm action={transitionFundRequestAction} className="space-y-3"><input name="id" type="hidden" value={id} /><select className="h-10 w-full border-b border-input bg-transparent" name="status">{actions.map((action) => <option key={action.status} value={action.status}>{action.status.replaceAll("_", " ")}</option>)}</select><textarea className="min-h-24 w-full border border-input bg-transparent p-3 text-sm" name="notes" placeholder="Catatan keputusan (wajib untuk revisi, penolakan, atau pembatalan)" /><Button className="min-h-11" type="submit">Terapkan perubahan</Button></ActionForm></CardContent></Card> : null}</div></div></div></PageContainer>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <Card className="shadow-sm"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-3 text-sm font-semibold">{value}</p></CardContent></Card>;
}
