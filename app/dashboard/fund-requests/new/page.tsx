import { PageContainer } from "@/components/app-shell/page-container";
import { ActionForm } from "@/components/shared/action-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getBlocks } from "@/src/features/blocks/actions";
import { getBudgetCategories, getBudgetPeriods } from "@/src/features/budgets/service";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { createFundRequestAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewFundRequestPage() {
  await requirePermission(PERMISSIONS.FUND_REQUEST_CREATE);
  const [periods, categories, blocks] = await Promise.all([
    getBudgetPeriods({ status: "APPROVED", pageSize: 100 }),
    getBudgetCategories(),
    getBlocks(),
  ]);
  const requestedAt = new Date().toISOString().slice(0, 10);

  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Pengajuan Dana", href: "/dashboard/fund-requests" }, { label: "Baru" }]} description="Simpan pengajuan sebagai draf sebelum diajukan untuk verifikasi." eyebrow="Keuangan" title="Pengajuan dana baru" /><section className="max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm">{periods.items.length && categories.length ? <ActionForm action={createFundRequestAction} className="space-y-5"><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Periode anggaran</span><select className="h-10 w-full border-b border-input bg-transparent" name="budgetPeriodId" required><option value="">Pilih periode disetujui</option>{periods.items.map((period) => <option key={period.id} value={period.id}>{period.periodKey}</option>)}</select></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Kategori anggaran</span><select className="h-10 w-full border-b border-input bg-transparent" name="budgetCategoryId" required><option value="">Pilih kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Blok terkait</span><select className="h-10 w-full border-b border-input bg-transparent" name="blockId"><option value="">Tidak terkait blok tertentu</option>{blocks.map((block) => <option key={block.id} value={block.id}>{block.code} · {block.name}</option>)}</select></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tanggal pengajuan</span><input className="h-10 w-full border-b border-input bg-transparent" defaultValue={requestedAt} name="requestedAt" type="date" required /></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Judul</span><input className="h-10 w-full border-b border-input bg-transparent" maxLength={255} name="title" required /></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Nilai pengajuan</span><input className="h-10 w-full border-b border-input bg-transparent" min="1" name="amount" type="number" required /></label><label className="block space-y-2 text-sm"><span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Uraian</span><textarea className="min-h-32 w-full border border-input bg-transparent p-3" maxLength={10_000} name="description" required /></label><Button type="submit">Simpan draf</Button></ActionForm> : <p className="text-sm text-muted-foreground">Periode anggaran yang disetujui dan kategori aktif diperlukan sebelum membuat pengajuan dana.</p>}</section></div></PageContainer>;
}
