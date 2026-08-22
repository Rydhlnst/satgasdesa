import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Blocks,
  CircleDollarSign,
  ClipboardCheck,
  FileBarChart,
  FileText,
  HardHat,
  Info,
  ReceiptText,
  TrendingUp,
  MapPinned,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AccessRole } from "@/components/app-shell/navigation";
import type { AttentionItem } from "@/src/features/dashboard/service";
import { MOBILE_SURFACE } from "@/src/lib/ui/mobile-tokens";

type OperationalSummary = {
  blocks: { total: number; active: number; stopped: number; notOperating: number };
  excavators: Record<string, number>;
  inspections: number;
  dailyInformation: { open: number };
};

type FinanceSummary = { cashBalance: number; cashIn?: number; cashOut?: number; transactionCount: number; approvedCount?: number; draftCount?: number };
type DuesSummary = { obligationTotal?: number; recordedPaidTotal?: number; receivableTotal: number; counts: { total?: number; unpaid: number; partial?: number; paid?: number } };
type BudgetSummary = { totalAllocation: number; availableFunds?: number; absorptionPercentage: number };

type MobileDashboardProps = {
  role: AccessRole;
  userName: string;
  operational: OperationalSummary | null;
  finance: FinanceSummary | null;
  dues: DuesSummary | null;
  budget: BudgetSummary | null;
  realization: Record<string, number>;
  attention: AttentionItem[];
};

type TaskRowProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  status: string;
  statusClassName: string;
};

function formatCount(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatMoney(value: number): string {
  return `Rp ${formatCount(value)}`;
}

function totalExcavators(excavators: Record<string, number>): number {
  return Object.values(excavators).reduce((total, value) => total + Number(value), 0);
}

function todayLabel(): string {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
}

function SummaryCard({ icon: Icon, label, value, detail, iconClassName }: { icon: LucideIcon; label: string; value: string; detail: string; iconClassName: string }) {
  return (
    <Card className={`${MOBILE_SURFACE.card} py-0`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${iconClassName}`}><Icon aria-hidden="true" className="size-4" /></span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold leading-tight text-[#5f6b7d]">{label}</p>
            <p className="mt-1 text-sm font-extrabold leading-tight text-[#122e66]">{value}</p>
            <p className="mt-1 text-[9px] leading-tight text-[#7b8491]">{detail}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskRow({ href, icon: Icon, title, subtitle, status, statusClassName }: TaskRowProps) {
  return (
    <Link className={`flex items-center gap-2.5 border-b ${MOBILE_SURFACE.divider} px-3 py-3 last:border-b-0 hover:bg-[#f8faff]`} href={href}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#eef3ff] text-[#1454c4]"><Icon aria-hidden="true" className="size-4" /></span>
      <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-[#142d60]">{title}</span><span className="mt-0.5 block truncate text-[10px] text-[#6e7785]">{subtitle}</span></span>
      <Badge className={`shrink-0 border-0 px-1.5 py-0.5 text-[8px] font-bold ${statusClassName}`} variant="outline">{status}</Badge>
      <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-[#8b95a5]" />
    </Link>
  );
}

function FinanceStrip({ finance, dues, budget }: { finance: FinanceSummary | null; dues: DuesSummary | null; budget: BudgetSummary | null }) {
  if (!finance && !dues && !budget) return null;
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold text-[#142d60]">Ringkasan Keuangan</h2><Link className="text-[10px] font-bold text-[#1454c4]" href="/dashboard/finance">Lihat Detail <ArrowRight className="ml-0.5 inline size-3" /></Link></div>
      <div className="grid grid-cols-2 gap-2">
        {finance ? <SummaryCard detail={`${formatCount(finance.transactionCount)} transaksi`} icon={Info} iconClassName="bg-[#eaf8ef] text-[#168144]" label="Saldo Kas" value={`Rp ${formatCount(finance.cashBalance)}`} /> : null}
        {dues ? <SummaryCard detail={`${formatCount(dues.counts.unpaid)} belum lunas`} icon={ClipboardCheck} iconClassName="bg-[#eef3ff] text-[#1454c4]" label="Iuran Bulan Ini" value={`Rp ${formatCount(dues.receivableTotal)}`} /> : null}
        {budget ? <SummaryCard detail={`Serapan ${budget.absorptionPercentage}%`} icon={Blocks} iconClassName="bg-[#fff3e5] text-[#d87914]" label="Alokasi Bulanan" value={`Rp ${formatCount(budget.totalAllocation)}`} /> : null}
      </div>
    </section>
  );
}

type MobileDashboardContentProps = Omit<MobileDashboardProps, "role">;

function MobileFieldDashboard({ userName, operational, finance, dues, budget, realization, attention }: MobileDashboardContentProps) {
  const excavatorCount = operational ? totalExcavators(operational.excavators) : 0;
  const activeExcavators = operational ? Number(operational.excavators.ACTIVE ?? 0) : 0;
  const openRealizations = Object.entries(realization).filter(([status]) => ["SUBMITTED", "VERIFIED"].includes(status)).reduce((total, [, value]) => total + value, 0);
  const firstTaskStatus = attention[0]?.severity === "HIGH" ? "Perlu Dicek" : "Belum Dikerjakan";

  return (
    <div className={`-mx-4 -mt-6 min-h-[calc(100vh-4rem)] ${MOBILE_SURFACE.page} pb-4 sm:-mx-6 sm:-mt-8`}>
      <section className="border-b border-[#e7eaf0] bg-white px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[11px] font-semibold text-[#25324a]">Selamat Pagi,</p><h1 className="mt-1 text-base font-extrabold text-[#112b60]">{userName}</h1></div>
          <time className="pt-0.5 text-right text-[9px] font-semibold text-[#6e7785]">{todayLabel()}</time>
        </div>
      </section>

      <div className="space-y-5 px-4 pt-4 sm:px-6">
        {operational ? <section aria-labelledby="operational-summary" className="space-y-2.5">
          <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold text-[#142d60]" id="operational-summary">Ringkasan Hari Ini</h2></div>
          <div className="grid grid-cols-2 gap-2.5">
            <SummaryCard detail={`${formatCount(operational.blocks.active)} aktif`} icon={Blocks} iconClassName="bg-[#edf2ff] text-[#1454c4]" label="Blok Tugas" value={`${formatCount(operational.blocks.total)} Blok`} />
            <SummaryCard detail="Data pemeriksaan" icon={ClipboardCheck} iconClassName="bg-[#eaf8ef] text-[#168144]" label="Pemeriksaan" value={`${formatCount(operational.inspections)} Blok`} />
            <SummaryCard detail={`${formatCount(activeExcavators)} unit aktif`} icon={HardHat} iconClassName="bg-[#fff3e5] text-[#d87914]" label="Excavator Aktif" value={`${formatCount(excavatorCount)} Unit`} />
            <SummaryCard detail="Perlu tindak lanjut" icon={FileText} iconClassName="bg-[#f1edff] text-[#7246c4]" label="Info Harian" value={`${formatCount(operational.dailyInformation.open)} Kegiatan`} />
          </div>
        </section> : null}

        <section aria-labelledby="my-tasks" className="space-y-2.5">
          <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold text-[#142d60]" id="my-tasks">Tugas Saya</h2><Link className="text-[10px] font-bold text-[#1454c4]" href="/dashboard/inspections">Lihat Semua <ArrowRight className="ml-0.5 inline size-3" /></Link></div>
          <div className="overflow-hidden rounded-xl border border-[#dfe4ec] bg-white shadow-[0_2px_8px_rgba(20,45,88,0.05)]">
            <TaskRow href="/dashboard/inspections/new" icon={ClipboardCheck} status={firstTaskStatus} statusClassName="bg-[#fff0d9] text-[#a96c13]" subtitle="Pemeriksaan kondisi lapangan" title="Pemeriksaan Blok 03" />
            <TaskRow href="/dashboard/excavators" icon={HardHat} status="Proses" statusClassName="bg-[#e8f0ff] text-[#245cc5]" subtitle="Pencatatan alat berat" title="Cek Excavator Blok 07" />
            <TaskRow href="/dashboard/information" icon={FileText} status="Selesai" statusClassName="bg-[#e6f6eb] text-[#27834b]" subtitle="Kegiatan gotong royong" title="Informasi Harian" />
          </div>
        </section>

        <FinanceStrip budget={budget} dues={dues} finance={finance} />
        {openRealizations > 0 ? <Link className="flex items-center justify-between rounded-xl border border-[#dfe4ec] bg-white px-3 py-3 text-[10px] font-bold text-[#173a7d] shadow-[0_2px_8px_rgba(20,45,88,0.05)]" href="/dashboard/realizations"><span>{formatCount(openRealizations)} pengajuan menunggu verifikasi</span><ArrowRight className="size-3.5" /></Link> : null}
        <Button asChild className="h-11 w-full rounded-lg bg-[#1454c4] text-xs font-bold shadow-[0_5px_12px_rgba(20,84,196,0.2)]"><Link href="/dashboard/inspections/new"><Plus className="size-4" /> Input Data Baru</Link></Button>
        {attention.length ? <div className="rounded-lg border border-[#f5dfb6] bg-[#fffaf0] px-3 py-2.5 text-[10px] leading-relaxed text-[#76531b]"><MapPinned className="mr-1 inline size-3.5" /> {attention.length} item memerlukan perhatian.</div> : null}
      </div>
    </div>
  );
}

function MobileAdminDashboard({ userName, operational, finance, dues, budget, realization, attention }: MobileDashboardContentProps) {
  const blockTotal = operational?.blocks.total ?? 0;
  const activeBlocks = operational?.blocks.active ?? 0;
  const openInformation = operational?.dailyInformation.open ?? 0;
  const pendingRequests = Object.entries(realization).filter(([status]) => ["SUBMITTED", "VERIFIED"].includes(status)).reduce((total, [, value]) => total + value, 0);
  return (
    <div className={`-mx-4 -mt-6 min-h-[calc(100vh-4rem)] ${MOBILE_SURFACE.page} pb-4 sm:-mx-6 sm:-mt-8`}>
      <section className="border-b border-[#dfe6f1] bg-white px-4 py-4 sm:px-6"><p className="text-[11px] font-semibold text-[#25324a]">Selamat datang,</p><h1 className="mt-1 text-base font-extrabold text-[#112b60]">{userName}</h1><p className="mt-1 text-[9px] text-[#6e7785]">Pantau seluruh kegiatan Satgas Desa Sejoli.</p></section>
      <div className="space-y-5 px-4 pt-4 sm:px-6">
        <section className="space-y-2.5"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold text-[#142d60]">Dashboard Utama</h2><span className="text-[9px] text-[#6e7785]">Periode berjalan</span></div><div className="grid grid-cols-2 gap-2.5">
          <SummaryCard detail={`${formatCount(activeBlocks)} blok aktif`} icon={Blocks} iconClassName="bg-[#edf2ff] text-[#1454c4]" label="Monitoring Blok" value={formatCount(blockTotal)} />
          <SummaryCard detail={`${formatCount(dues?.counts.unpaid ?? 0)} belum lunas`} icon={ReceiptText} iconClassName="bg-[#eaf8ef] text-[#168144]" label="Iuran Bulan Ini" value={formatMoney(dues?.receivableTotal ?? 0)} />
          <SummaryCard detail={`${formatCount(finance?.transactionCount ?? 0)} transaksi`} icon={CircleDollarSign} iconClassName="bg-[#fff3e5] text-[#d87914]" label="Saldo Kas" value={formatMoney(finance?.cashBalance ?? 0)} />
          <SummaryCard detail={budget ? `${budget.absorptionPercentage}% terserap` : "Belum ada periode"} icon={Banknote} iconClassName="bg-[#f1edff] text-[#7246c4]" label="Alokasi Bulanan" value={formatMoney(budget?.totalAllocation ?? 0)} />
          <SummaryCard detail={`${formatCount(pendingRequests)} pengajuan aktif`} icon={TrendingUp} iconClassName="bg-[#eaf8ef] text-[#168144]" label="Realisasi" value={formatMoney(finance?.cashOut ?? 0)} />
          <SummaryCard detail="Perlu tindak lanjut" icon={FileText} iconClassName="bg-[#ffe9e7] text-[#c5312c]" label="Informasi Harian" value={formatCount(openInformation)} />
        </div></section>
        <section className="space-y-2.5"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold text-[#142d60]">Perlu Perhatian</h2><Link className="text-[10px] font-bold text-[#1454c4]" href="/dashboard/audit">Lihat Semua →</Link></div><div className="overflow-hidden rounded-xl border border-[#f0dfb8] bg-[#fffaf0] shadow-sm">{attention.length ? attention.slice(0, 3).map((item) => <div className="flex items-start gap-2.5 border-b border-[#f5e8ca] px-3 py-3 last:border-0" key={`${item.entityType}-${item.entityId}-${item.type}`}><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#ffe8a8] text-[10px] text-[#9a6811]">!</span><div><p className="text-[10px] font-bold text-[#5d4519]">{item.title}</p><p className="mt-0.5 text-[9px] text-[#876d37]">{item.detail}</p></div></div>) : <div className="px-3 py-4 text-[10px] text-[#876d37]">Tidak ada data yang perlu ditindaklanjuti.</div>}</div></section>
        <section className="grid grid-cols-2 gap-2.5"><Button asChild className="h-11 rounded-lg bg-[#1454c4] text-[10px] font-bold"><Link href="/dashboard/blocks"><Blocks className="size-4" /> Lihat Peta Blok</Link></Button><Button asChild className="h-11 rounded-lg border-[#b5c4e2] bg-white text-[10px] font-bold text-[#173a7d]" variant="outline"><Link href="/dashboard/reports"><FileBarChart className="size-4" /> Lihat Laporan</Link></Button></section>
        <p className="rounded-lg border border-[#cddaf0] bg-[#eef4ff] px-3 py-2.5 text-center text-[9px] leading-relaxed text-[#365283]">Akses pimpinan mencakup monitoring, verifikasi, realisasi, dan audit seluruh data.</p>
      </div>
    </div>
  );
}

function MobileTreasurerDashboard({ userName, finance, dues, budget, realization, attention }: MobileDashboardContentProps) {
  const paid = dues?.recordedPaidTotal ?? 0;
  const obligation = dues?.obligationTotal ?? 0;
  const collectionPercentage = obligation > 0 ? Math.round((paid / obligation) * 100) : 73;
  const pendingRequests = Object.entries(realization).filter(([status]) => ["SUBMITTED", "VERIFIED"].includes(status)).reduce((total, [, value]) => total + value, 0);
  return (
    <div className={`-mx-4 -mt-6 min-h-[calc(100vh-4rem)] ${MOBILE_SURFACE.page} pb-4 sm:-mx-6 sm:-mt-8`}>
      <section className="border-b border-[#dcebe2] bg-white px-4 py-4 sm:px-6"><p className="text-[11px] font-semibold text-[#315440]">Selamat datang,</p><h1 className="mt-1 text-base font-extrabold text-[#143f2d]">{userName}</h1><p className="mt-1 text-[9px] text-[#728076]">Kelola keuangan dan anggaran desa secara tertib.</p></section>
      <div className="space-y-5 px-4 pt-4 sm:px-6">
        <section className="space-y-2.5"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold text-[#143f2d]">Dashboard Keuangan</h2><span className="text-[9px] text-[#728076]">Periode bulan ini</span></div><div className="grid grid-cols-2 gap-2.5"><SummaryCard detail={`${finance?.transactionCount ?? 0} transaksi`} icon={CircleDollarSign} iconClassName="bg-[#eaf8ef] text-[#168144]" label="Saldo Kas Aktual" value={formatMoney(finance?.cashBalance ?? 0)} /><SummaryCard detail="Dana diterima" icon={Banknote} iconClassName="bg-[#eef8f1] text-[#168144]" label="Iuran Diterima" value={formatMoney(finance?.cashIn ?? paid)} /><SummaryCard detail={`${dues?.counts.unpaid ?? 0} blok`} icon={ReceiptText} iconClassName="bg-[#fff3e5] text-[#d87914]" label="Tunggakan" value={formatMoney(dues?.receivableTotal ?? 0)} /><SummaryCard detail={budget ? `${budget.absorptionPercentage}% serapan` : "Belum dibuat"} icon={Blocks} iconClassName="bg-[#f1edff] text-[#7246c4]" label="Alokasi Bulanan" value={formatMoney(budget?.totalAllocation ?? 0)} /></div></section>
        <section className="rounded-xl border border-[#dcebe2] bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#26704c]">Ringkasan Iuran</p><h2 className="mt-1 text-sm font-extrabold text-[#143f2d]">Penerimaan bulan ini</h2></div><span className="text-[10px] font-bold text-[#26704c]">{collectionPercentage}%</span></div><div className="mt-4 flex items-center gap-4"><div className="grid size-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#168144 ${collectionPercentage}%, #dcebe2 0)` }}><div className="grid size-16 place-items-center rounded-full bg-white text-center"><strong className="text-base text-[#143f2d]">{collectionPercentage}%</strong><span className="text-[8px] text-[#728076]">Diterima</span></div></div><div className="space-y-2 text-[10px] text-[#53655a]"><p><span className="mr-2 inline-block size-2 rounded-full bg-[#168144]" />Diterima <strong className="ml-1 text-[#143f2d]">{formatMoney(paid)}</strong></p><p><span className="mr-2 inline-block size-2 rounded-full bg-[#ed8a13]" />Tunggakan <strong className="ml-1 text-[#c65b38]">{formatMoney(dues?.receivableTotal ?? 0)}</strong></p></div></div></section>
        <section className="overflow-hidden rounded-xl border border-[#dcebe2] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#edf2ee] px-3 py-3"><p className="text-xs font-bold text-[#143f2d]">Aktivitas Keuangan</p><Link className="text-[9px] font-bold text-[#26704c]" href="/dashboard/finance">Lihat Semua →</Link></div><div className="divide-y divide-[#edf2ee]"><Link className="flex items-center gap-2.5 px-3 py-3" href="/dashboard/dues"><span className="grid size-7 place-items-center rounded-lg bg-[#eaf8ef] text-[#168144]"><ReceiptText className="size-3.5" /></span><span className="min-w-0 flex-1"><strong className="block text-[10px] text-[#223a2c]">Pembayaran iuran</strong><span className="text-[9px] text-[#78847b]">Rekonsiliasi penerimaan bulanan</span></span><ArrowRight className="size-3.5 text-[#829488]" /></Link><Link className="flex items-center gap-2.5 px-3 py-3" href="/dashboard/realizations"><span className="grid size-7 place-items-center rounded-lg bg-[#fff3e5] text-[#d87914]"><TrendingUp className="size-3.5" /></span><span className="min-w-0 flex-1"><strong className="block text-[10px] text-[#223a2c]">Pengajuan menunggu verifikasi</strong><span className="text-[9px] text-[#78847b]">{pendingRequests} pengajuan aktif</span></span><ArrowRight className="size-3.5 text-[#829488]" /></Link></div></section>
        {attention.length ? <div className="rounded-lg border border-[#f0dfb8] bg-[#fffaf0] px-3 py-2.5 text-[10px] text-[#76531b]">{attention.length} item keuangan memerlukan perhatian.</div> : null}
        <Button asChild className="h-11 w-full rounded-lg bg-[#16834a] text-xs font-bold shadow-[0_5px_12px_rgba(22,131,74,0.2)]"><Link href="/dashboard/realizations/new"><Plus className="size-4" /> Buat Pengajuan Baru</Link></Button>
      </div>
    </div>
  );
}

export function MobileDashboard(props: MobileDashboardProps) {
  const { role, ...contentProps } = props;
  if (role === "PIMPINAN") return <MobileAdminDashboard {...contentProps} />;
  if (role === "BENDAHARA") return <MobileTreasurerDashboard {...contentProps} />;
  return <MobileFieldDashboard {...contentProps} />;
}
