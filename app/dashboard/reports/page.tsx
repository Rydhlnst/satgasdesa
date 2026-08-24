import Link from "next/link";
import { FileBarChart, ReceiptText, WalletCards } from "lucide-react";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requirePermission(PERMISSIONS.REPORT_READ);
  return <PageContainer><div className="space-y-8"><PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }]} description="Review the current monthly operational, financial, budget, dues, and realization recap." eyebrow="Management" title="Reports" /><section className="rounded-2xl border border-border bg-card p-6 shadow-sm"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Laporan utama</p><h2 className="mt-2 font-heading text-2xl font-semibold">Rekap bulanan</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Satu laporan untuk arus kas, iuran, serapan anggaran, blok, realisasi, dan informasi lapangan.</p></div><Button asChild><Link href="/dashboard/reports/monthly">Buka laporan bulanan <FileBarChart aria-hidden="true" /></Link></Button></div><div className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-3"><ReportScope icon={WalletCards} label="Keuangan & iuran" /><ReportScope icon={ReceiptText} label="Anggaran & realisasi" /><ReportScope icon={FileBarChart} label="Operasional & informasi" /></div></section></div></PageContainer>;
}

function ReportScope({ icon: Icon, label }: { icon: typeof FileBarChart; label: string }) {
  return <div className="flex items-center gap-3 rounded-xl bg-muted/45 p-3"><span className="grid size-8 place-items-center rounded-lg bg-background text-primary"><Icon aria-hidden="true" className="size-4" /></span><span className="text-sm font-medium">{label}</span></div>;
}
