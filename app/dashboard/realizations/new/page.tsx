import { PageContainer } from "@/components/app-shell/page-container";
import { ActionForm } from "@/components/shared/action-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getFundRequests } from "@/src/features/fund-requests/service";
import { getBudgetPeriodDetail, getBudgetPeriods } from "@/src/features/budgets/service";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { createRealizationAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewRealizationPage() {
  await requirePermission(PERMISSIONS.REALIZATION_CREATE);
  const periods = await getBudgetPeriods({ status: "APPROVED", pageSize: 100 });
  const [details, requests] = await Promise.all([
    Promise.all(periods.items.map((period) => getBudgetPeriodDetail(period.id))),
    getFundRequests({ status: "APPROVED", pageSize: 100 }),
  ]);
  const items = details.flatMap((detail) => detail.groups.flatMap((group) => group.items.map((item) => ({ ...item, groupName: group.name, periodKey: detail.period.periodKey }))));
  const realizationDate = new Date().toISOString().slice(0, 10);

  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Realizations", href: "/dashboard/realizations" }, { label: "New" }]} description="Catat penggunaan dana yang sudah disetujui dan hubungkan ke proposal agar arus kas serta bukti pembayaran dapat ditelusuri." eyebrow="Finance" title="New realization" /><section className="max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm">{items.length ? <ActionForm action={createRealizationAction} className="space-y-5"><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Budget item</span><select className="h-10 w-full border-b border-input bg-transparent" name="budgetItemId" required><option value="">Select approved budget item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.periodKey} · {item.groupName} · {item.name}</option>)}</select></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Approved fund proposal</span><select className="h-10 w-full border-b border-input bg-transparent" name="fundRequestId"><option value="">Tidak terkait proposal</option>{requests.items.map((request) => <option key={request.request.id} value={request.request.id}>{request.request.requestNumber} · {request.request.title} · Rp{request.request.amount.toLocaleString("id-ID")}</option>)}</select><span className="text-xs text-muted-foreground">Pilih proposal yang sudah disetujui Pimpinan/Admin jika pengeluaran berasal dari pengajuan Bendahara.</span></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Activity</span><input className="h-10 w-full border-b border-input bg-transparent" maxLength={255} name="activity" placeholder="Contoh: Pembelian material blok 03" required /></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Realization date</span><input className="h-10 w-full border-b border-input bg-transparent" defaultValue={realizationDate} name="realizationDate" type="date" required /></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Requested amount</span><input className="h-10 w-full border-b border-input bg-transparent" min="1" name="requestedAmount" type="number" required /></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Description</span><textarea className="min-h-32 w-full border border-input bg-transparent p-3" maxLength={10000} name="description" placeholder="Jelaskan barang/jasa, penerima, dan tujuan penggunaan dana." required /></label><p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">Setelah realisasi dibuat, unggah kuitansi atau bukti transfer pada detail realisasi sebelum diajukan untuk pemeriksaan.</p><Button type="submit">Create draft request</Button></ActionForm> : <p className="text-sm text-muted-foreground">No approved budget items are available. Approve a budget period first.</p>}</section></div></PageContainer>;
}
