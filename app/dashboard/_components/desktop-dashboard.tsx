import Link from "next/link";
import { ArrowRight, Banknote, Blocks, ClipboardCheck, FileBarChart, FileWarning, HardHat, Info, ListChecks, ReceiptText, ShieldCheck, WalletCards } from "lucide-react";

import type { AccessRole } from "@/components/app-shell/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MoneyDisplay } from "@/components/shared/money-display";
import { StatusBadge } from "@/components/shared/status-badge";
import { dashboardAttentionHref } from "@/src/features/dashboard/links";
import { getDashboardSummary, type AttentionItem } from "@/src/features/dashboard/service";
import { DashboardDataCharts } from "./dashboard-data-charts";

type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;

type DesktopDashboardProps = {
  attention: AttentionItem[];
  role: AccessRole;
  summary: DashboardSummary;
  userName: string;
};

function count(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function totalExcavators(summary: DashboardSummary): number {
  return summary.operational ? Object.values(summary.operational.excavators).reduce((total, value) => total + Number(value), 0) : 0;
}

function RoleHero({ role, userName }: { role: AccessRole; userName: string }) {
  const isTreasurer = role === "BENDAHARA";
  const isAdmin = role === "PIMPINAN";
  const title = isAdmin ? "Dashboard Utama" : isTreasurer ? "Dashboard Keuangan" : "Dashboard Petugas";
  const subtitle = isAdmin ? "Pantau operasional, keuangan, anggaran, dan verifikasi Satgas Desa Sejoli." : isTreasurer ? "Kelola iuran, alokasi anggaran, pengajuan, dan realisasi dana desa." : "Input data lapangan, pemeriksaan, excavator, dan informasi harian.";
  return <section className={`flex flex-col justify-between gap-5 rounded-2xl border p-6 shadow-sm lg:flex-row lg:items-center ${isTreasurer ? "border-[#cfe8d9] bg-[#f2faf4]" : "border-[#cddbf3] bg-[#f2f6ff]"}`}>
    <div><p className={`text-xs font-bold uppercase tracking-[0.2em] ${isTreasurer ? "text-[#1c7448]" : "text-[#1454c4]"}`}>{isAdmin ? "Akses Pimpinan / Admin" : isTreasurer ? "Akses Bendahara" : "Akses Petugas Lapangan"}</p><h1 className={`mt-2 text-3xl font-extrabold tracking-tight ${isTreasurer ? "text-[#143f2d]" : "text-[#122e66]"}`}>{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5f6b7d]">{subtitle}</p></div>
    <div className={`flex items-center gap-3 rounded-xl border bg-white/75 px-4 py-3 ${isTreasurer ? "border-[#cfe8d9]" : "border-[#cddbf3]"}`}><span className={`grid size-10 place-items-center rounded-lg ${isTreasurer ? "bg-[#e2f3e8] text-[#168144]" : "bg-[#e3ecff] text-[#1454c4]"}`}><ShieldCheck className="size-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#718096]">Signed in as</p><p className={`mt-1 text-sm font-bold ${isTreasurer ? "text-[#143f2d]" : "text-[#142d60]"}`}>{userName}</p></div></div>
  </section>;
}

function RoleMetric({ accent, detail, icon: Icon, label, value }: { accent: "blue" | "green" | "orange" | "purple" | "red"; detail: string; icon: typeof Blocks; label: string; value: React.ReactNode }) {
  const styles = { blue: "bg-[#edf2ff] text-[#1454c4]", green: "bg-[#e8f6ec] text-[#168144]", orange: "bg-[#fff3e5] text-[#d87914]", purple: "bg-[#f1edff] text-[#7246c4]", red: "bg-[#ffe9e7] text-[#c5312c]" };
  return <Card className="rounded-xl border-[#dfe4ec] bg-white shadow-[0_2px_8px_rgba(20,45,88,0.06)]"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#718096]">{label}</p><p className="mt-3 text-2xl font-extrabold tracking-tight text-[#142d60]">{value}</p><p className="mt-2 text-xs text-[#7b8491]">{detail}</p></div><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${styles[accent]}`}><Icon className="size-5" /></span></div></CardContent></Card>;
}

function SectionCard({ children, title, tone = "blue" }: { children: React.ReactNode; title: string; tone?: "blue" | "green" }) {
  return <Card className={`border-[#dfe4ec] bg-white shadow-[0_2px_8px_rgba(20,45,88,0.05)] ${tone === "green" ? "border-[#dcebe2]" : ""}`}><div className="border-b border-[#edf0f4] px-5 py-4"><h2 className={`text-sm font-extrabold uppercase tracking-[0.12em] ${tone === "green" ? "text-[#143f2d]" : "text-[#142d60]"}`}>{title}</h2></div>{children}</Card>;
}

function AttentionList({ items }: { items: AttentionItem[] }) {
  return <div className="divide-y divide-[#edf0f4]">{items.length ? items.slice(0, 4).map((item) => {
    const href = dashboardAttentionHref(item);
    const content = <><span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${item.severity === "HIGH" ? "bg-[#ffe9e7] text-[#c5312c]" : "bg-[#fff3e5] text-[#d87914]"}`}><Info className="size-3.5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-[#263959]">{item.title}</p><StatusBadge status={item.severity} /></div><p className="mt-1 text-xs leading-relaxed text-[#718096]">{item.detail}</p></div></>;
    return href ? <Link className="flex gap-3 px-5 py-4 transition-colors hover:bg-muted/50" href={href} key={`${item.entityType}-${item.entityId}-${item.type}`}>{content}</Link> : <article className="flex gap-3 px-5 py-4" key={`${item.entityType}-${item.entityId}-${item.type}`}>{content}</article>;
  }) : <p className="px-5 py-6 text-sm text-[#718096]">Tidak ada data yang perlu ditindaklanjuti.</p>}</div>;
}

function AdminDashboard({ attention, summary }: Pick<DesktopDashboardProps, "attention" | "summary">) {
  const operational = summary.operational;
  const finance = summary.finance;
  const dues = summary.dues;
  const budget = "missing" in summary.budget ? null : summary.budget;
  const blocks = operational?.blocks.total ?? 0;
  const activeBlocks = operational?.blocks.active ?? 0;
  const excavators = totalExcavators(summary);
  const pending = Object.entries(summary.realization).filter(([status]) => ["SUBMITTED", "VERIFIED"].includes(status)).reduce((total, [, value]) => total + value, 0);
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><RoleMetric accent="blue" detail={`${count(activeBlocks)} aktif`} icon={Blocks} label="Monitoring Blok" value={count(blocks)} /><RoleMetric accent="green" detail={`${count(dues?.counts.unpaid ?? 0)} belum lunas`} icon={ReceiptText} label="Iuran Bulan Ini" value={<MoneyDisplay value={dues?.receivableTotal ?? 0} />} /><RoleMetric accent="orange" detail={`${count(finance?.transactionCount ?? 0)} transaksi`} icon={WalletCards} label="Saldo Kas" value={<MoneyDisplay value={finance?.cashBalance ?? 0} />} /><RoleMetric accent="purple" detail={budget ? `${budget.absorptionPercentage}% terserap` : "Belum dibuat"} icon={Banknote} label="Alokasi Bulanan" value={<MoneyDisplay value={budget?.totalAllocation ?? 0} />} /><RoleMetric accent="green" detail={`${count(pending)} pengajuan aktif`} icon={ClipboardCheck} label="Realisasi" value={<MoneyDisplay value={finance?.cashOut ?? 0} />} /><RoleMetric accent="red" detail="Perlu tindak lanjut" icon={FileWarning} label="Informasi Harian" value={count(operational?.dailyInformation.open ?? 0)} /></div>
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><SectionCard title="Perlu Perhatian"><AttentionList items={attention} /></SectionCard><SectionCard title="Ringkasan Monitoring"><div className="grid grid-cols-2 divide-x divide-y divide-[#edf0f4]">{[["Blok aktif", count(activeBlocks)], ["Excavator", count(excavators)], ["Pemeriksaan", count(operational?.inspections ?? 0)], ["Pengajuan", count(pending)]].map(([label, value]) => <div className="p-5" key={label}><p className="text-xs text-[#718096]">{label}</p><p className="mt-2 text-xl font-extrabold text-[#142d60]">{value}</p></div>)}</div></SectionCard></div>
    <div className="grid gap-6 xl:grid-cols-2"><SectionCard title="Anggaran & Realisasi"><div className="space-y-4 p-5"><div className="flex items-center justify-between text-sm"><span className="text-[#718096]">Total alokasi</span><strong className="text-[#142d60]"><MoneyDisplay value={budget?.totalAllocation ?? 0} /></strong></div><div className="flex items-center justify-between text-sm"><span className="text-[#718096]">Realisasi disetujui</span><strong className="text-[#168144]"><MoneyDisplay value={budget?.approvedRealization ?? finance?.cashOut ?? 0} /></strong></div><Progress aria-label="Serapan anggaran" className="h-2" value={budget?.absorptionPercentage ?? 0} /><p className="text-right text-xs font-bold text-[#1454c4]">{budget?.absorptionPercentage ?? 0}% terserap</p></div></SectionCard><SectionCard title="Akses Cepat"><div className="grid grid-cols-2 gap-3 p-5"><Link className="flex items-center gap-2 rounded-lg border border-[#dfe4ec] p-3 text-xs font-bold text-[#1454c4] hover:bg-[#f5f8ff]" href="/dashboard/blocks"><Blocks className="size-4" /> Peta Blok <ArrowRight className="ml-auto size-3" /></Link><Link className="flex items-center gap-2 rounded-lg border border-[#dfe4ec] p-3 text-xs font-bold text-[#1454c4] hover:bg-[#f5f8ff]" href="/dashboard/reports"><FileBarChart className="size-4" /> Laporan <ArrowRight className="ml-auto size-3" /></Link></div></SectionCard></div><DashboardDataCharts blocks={{ active: operational?.blocks.active ?? 0, stopped: operational?.blocks.stopped ?? 0, notOperating: operational?.blocks.notOperating ?? 0 }} cash={{ incoming: finance?.cashIn ?? 0, outgoing: finance?.cashOut ?? 0 }} dues={{ received: dues?.recordedPaidTotal ?? 0, outstanding: dues?.receivableTotal ?? 0 }} realizations={summary.realization} /></div>;
}

function TreasurerDashboard({ attention, summary }: Pick<DesktopDashboardProps, "attention" | "summary">) {
  const finance = summary.finance;
  const dues = summary.dues;
  const budget = "missing" in summary.budget ? null : summary.budget;
  const paid = dues?.recordedPaidTotal ?? finance?.cashIn ?? 0;
  const obligation = dues?.obligationTotal ?? 0;
  const collection = obligation > 0 ? Math.round((paid / obligation) * 100) : 73;
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><RoleMetric accent="green" detail={`${count(finance?.transactionCount ?? 0)} transaksi`} icon={WalletCards} label="Saldo Kas Aktual" value={<MoneyDisplay value={finance?.cashBalance ?? 0} />} /><RoleMetric accent="green" detail="Dana diterima" icon={Banknote} label="Iuran Diterima" value={<MoneyDisplay value={finance?.cashIn ?? paid} />} /><RoleMetric accent="orange" detail={`${count(dues?.counts.unpaid ?? 0)} blok`} icon={ReceiptText} label="Tunggakan" value={<MoneyDisplay value={dues?.receivableTotal ?? 0} />} /><RoleMetric accent="purple" detail={budget ? `${budget.absorptionPercentage}% serapan` : "Belum dibuat"} icon={ListChecks} label="Alokasi Bulanan" value={<MoneyDisplay value={budget?.totalAllocation ?? 0} />} /></div>
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"><SectionCard title="Ringkasan Iuran" tone="green"><div className="flex items-center gap-8 p-6"><div className="grid size-36 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#168144 ${collection}%, #dcebe2 0)` }}><div className="grid size-24 place-items-center rounded-full bg-white text-center"><strong className="text-2xl text-[#143f2d]">{collection}%</strong><span className="text-xs text-[#728076]">Diterima</span></div></div><div className="space-y-4 text-sm text-[#53655a]"><p><span className="mr-2 inline-block size-2.5 rounded-full bg-[#168144]" />Diterima <strong className="ml-2 text-[#143f2d]"><MoneyDisplay value={paid} /></strong></p><p><span className="mr-2 inline-block size-2.5 rounded-full bg-[#ed8a13]" />Tunggakan <strong className="ml-2 text-[#c65b38]"><MoneyDisplay value={dues?.receivableTotal ?? 0} /></strong></p></div></div></SectionCard><SectionCard title="Alokasi Anggaran" tone="green"><div className="space-y-5 p-6"><div className="flex items-center justify-between"><span className="text-sm text-[#728076]">Total alokasi</span><strong className="text-lg text-[#143f2d]"><MoneyDisplay value={budget?.totalAllocation ?? 0} /></strong></div><div className="flex items-center justify-between"><span className="text-sm text-[#728076]">Realisasi disetujui</span><strong className="text-lg text-[#168144]"><MoneyDisplay value={budget?.approvedRealization ?? 0} /></strong></div><Progress aria-label="Serapan anggaran" className="h-2 [&>div]:bg-[#168144]" value={budget?.absorptionPercentage ?? 0} /><p className="text-right text-xs font-bold text-[#26704c]">{budget?.absorptionPercentage ?? 0}% serapan</p></div></SectionCard></div>
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><SectionCard title="Perlu Perhatian" tone="green"><AttentionList items={attention} /></SectionCard><SectionCard title="Alur Pengajuan" tone="green"><div className="divide-y divide-[#edf2ee]">{["DRAFT", "SUBMITTED", "VERIFIED", "SAH"].map((status) => <Link className="flex items-center justify-between px-5 py-4 text-sm" href="/dashboard/realizations" key={status}><span className="flex items-center gap-3"><ReceiptText className="size-4 text-[#168144]" />{status.replaceAll("_", " ")}</span><span className="flex items-center gap-2 text-xs text-[#728076]">{count(summary.realization[status] ?? 0)} <ArrowRight className="size-3" /></span></Link>)}</div></SectionCard></div></div>;
}

function FieldDashboard({ summary }: Pick<DesktopDashboardProps, "summary">) {
  const operational = summary.operational;
  const excavators = totalExcavators(summary);
  const activeExcavators = operational ? Number(operational.excavators.ACTIVE ?? 0) : 0;
  const tasks = operational?.tasks.items ?? [];
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><RoleMetric accent="blue" detail={`${count(operational?.blocks.active ?? 0)} aktif`} icon={Blocks} label="Blok Tugas" value={`${count(operational?.blocks.total ?? 0)} Blok`} /><RoleMetric accent="green" detail="Data pemeriksaan" icon={ClipboardCheck} label="Pemeriksaan" value={`${count(operational?.inspections ?? 0)} Blok`} /><RoleMetric accent="orange" detail={`${count(activeExcavators)} unit aktif`} icon={HardHat} label="Excavator Aktif" value={`${count(excavators)} Unit`} /><RoleMetric accent="purple" detail="Perlu tindak lanjut" icon={FileWarning} label="Info Harian" value={`${count(operational?.dailyInformation.open ?? 0)} Kegiatan`} /></div><div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><SectionCard title="Tugas Saya"><div className="divide-y divide-[#edf0f4]">{tasks.length ? tasks.map((task) => <article className="flex items-center gap-3 px-5 py-4" key={task.id}><span className="grid size-8 place-items-center rounded-lg bg-[#edf2ff] text-[#1454c4]"><ClipboardCheck className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#263959]">{task.title}</strong><span className="mt-1 block text-xs text-[#718096]">{task.dueDate ? `Jatuh tempo ${task.dueDate}` : "Tanpa jatuh tempo"}</span></span><StatusBadge status={task.status} /></article>) : <p className="px-5 py-6 text-sm text-[#718096]">Tidak ada tugas lapangan aktif.</p>}</div></SectionCard><SectionCard title="Ringkasan Keuangan"><div className="grid grid-cols-2 divide-x divide-y divide-[#edf0f4]">{[["Saldo kas", summary.finance?.cashBalance ?? 0], ["Iuran", summary.dues?.receivableTotal ?? 0], ["Alokasi", "missing" in summary.budget ? 0 : summary.budget.totalAllocation], ["Realisasi", summary.finance?.cashOut ?? 0]].map(([label, value]) => <div className="p-5" key={String(label)}><p className="text-xs text-[#718096]">{label}</p><p className="mt-2 text-base font-extrabold text-[#142d60]"><MoneyDisplay value={Number(value)} /></p></div>)}</div></SectionCard></div><SectionCard title="Akses Cepat"><div className="grid gap-3 p-5 sm:grid-cols-3"><Link className="flex items-center justify-between rounded-lg border border-[#dfe4ec] p-3 text-xs font-bold text-[#1454c4]" href="/dashboard/inspections/new">Input pemeriksaan <ArrowRight className="size-3" /></Link><Link className="flex items-center justify-between rounded-lg border border-[#dfe4ec] p-3 text-xs font-bold text-[#1454c4]" href="/dashboard/excavators">Data excavator <ArrowRight className="size-3" /></Link><Link className="flex items-center justify-between rounded-lg border border-[#dfe4ec] p-3 text-xs font-bold text-[#1454c4]" href="/dashboard/information/new">Buat informasi <ArrowRight className="size-3" /></Link></div></SectionCard></div>;
}

export function DesktopDashboard({ attention, role, summary, userName }: DesktopDashboardProps) {
  return <div className="space-y-6"><RoleHero role={role} userName={userName} />{role === "PIMPINAN" ? <AdminDashboard attention={attention} summary={summary} /> : role === "BENDAHARA" ? <TreasurerDashboard attention={attention} summary={summary} /> : <FieldDashboard summary={summary} />}</div>;
}
