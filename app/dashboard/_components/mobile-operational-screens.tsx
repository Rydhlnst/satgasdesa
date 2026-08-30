"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, ClipboardCheck, MapPin, Plus, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { MOBILE_SURFACE } from "@/src/lib/ui/mobile-tokens";

type ExcavatorRow = {
  id: string;
  unitCode: string;
  brand: string;
  model: string;
  operatorName: string | null;
  status: string;
  blockCode: string | null;
};

type InformationRow = {
  id: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  reportedAt: Date;
  blockCode: string;
  time?: string;
};

type InspectionRow = {
  id: string;
  blockCode: string;
  blockName: string;
  inspectedAt: Date;
  condition: string;
  excavatorCount: number;
  workerCount: number;
};

function statusClass(status: string): string {
  if (["ACTIVE", "COMPLETED", "CLOSED", "SAH"].includes(status)) return MOBILE_SURFACE.statusSuccess;
  if (["STOPPED", "URGENT", "HIGH"].includes(status)) return MOBILE_SURFACE.statusDanger;
  if (["INACTIVE", "NOT_ACTIVE"].includes(status)) return "bg-[#f1f2f4] text-[#5c6675]";
  return MOBILE_SURFACE.statusWarning;
}

export function MobileInspectionList({ items, canCreate }: { items: InspectionRow[]; canCreate: boolean }) {
  return <section className="space-y-3 md:hidden"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1454c4]">Monitoring Lapangan</p><h2 className="mt-1 text-sm font-extrabold text-[#142d60]">Pemeriksaan Terbaru</h2></div><span className="rounded-full bg-[#edf2ff] px-2 py-1 text-[9px] font-bold text-[#1454c4]">{items.length} Data</span></div>{items.length ? <div className="space-y-2.5">{items.slice(0, 6).map((item) => <Link className={`flex gap-3 ${MOBILE_SURFACE.cardPadded}`} href={`/dashboard/inspections/${item.id}`} key={item.id}><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#edf2ff] text-[#1454c4]"><ClipboardCheck className="size-5" /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><strong className="text-[11px] text-[#142d60]">{item.blockCode}</strong><time className="text-[8px] text-[#7b8491]">{item.inspectedAt.toLocaleString("id-ID")}</time></span><span className="mt-1 block text-[10px] font-semibold text-[#263959]">{item.blockName}</span><span className="mt-1 block text-[9px] text-[#697588]">{item.excavatorCount} excavator · {item.workerCount} pekerja</span><span className="mt-2 inline-flex rounded-full bg-[#e8f6ec] px-1.5 py-0.5 text-[8px] font-bold text-[#27834b]">Terpantau</span></span><ArrowRight className="mt-4 size-3.5 shrink-0 text-[#8490a1]" /></Link>)}</div> : <div className="rounded-2xl border border-border bg-card"><EmptyState description="Data pemeriksaan lapangan akan muncul setelah petugas mengirim inspeksi." title="Belum ada pemeriksaan" /></div>}{canCreate ? <Button asChild className="h-11 w-full rounded-lg bg-[#1454c4] text-xs font-bold"><Link href="/dashboard/inspections/new"><Plus className="size-4" /> Tambah Pemeriksaan</Link></Button> : null}</section>;
}

export function MobileExcavatorScreen({ rows, canManage }: { rows: ExcavatorRow[]; canManage: boolean }) {
  const active = rows.filter((row) => row.status === "ACTIVE").length;
  const stopped = rows.filter((row) => row.status === "STOPPED").length;
  const inactive = rows.length - active - stopped;
  return (
    <section className="space-y-4 md:hidden">
      <div className="grid grid-cols-4 gap-1.5">{[["Total Excavator", rows.length, "bg-[#edf2ff] text-[#1454c4]"], ["Aktif", active, "bg-[#e8f6ec] text-[#27834b]"], ["Rusak", stopped, "bg-[#ffe9e7] text-[#c5312c]"], ["Tidak Aktif", inactive, "bg-[#f1f2f4] text-[#5c6675]"]].map(([label, value, className]) => <div className={`rounded-lg border border-[#dfe4ec] p-2 text-center ${className}`} key={String(label)}><p className="text-[8px] font-semibold leading-tight">{label}</p><p className="mt-1 text-sm font-extrabold">{value}</p><p className="text-[8px]">Unit</p></div>)}</div>
      <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold text-[#142d60]">Daftar Excavator</h2><button aria-label="Filter excavator" className="rounded-lg border border-[#dfe4ec] bg-white p-2 text-[#173a7d]" onClick={() => toast.info("Gunakan filter status di daftar excavator.")} type="button"><SlidersHorizontal className="size-3.5" /></button></div>
      <div className="space-y-2.5">{rows.length ? rows.map((row) => <Link className="flex gap-2.5 rounded-xl border border-[#dfe4ec] bg-white p-2.5 shadow-sm" href={`/dashboard/excavators/${row.id}`} key={row.id}><div className="size-14 shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: "url('/reference/excavator.svg')" }} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="text-[11px] font-extrabold text-[#263959]">{row.unitCode}</p><p className="mt-0.5 text-[10px] text-[#4c596c]">{row.brand} {row.model}</p></div><Badge className={`border-0 px-1.5 py-0.5 text-[8px] ${statusClass(row.status)}`} variant="outline">{row.status === "ACTIVE" ? "AKTIF" : row.status === "STOPPED" ? "RUSAK" : "TIDAK AKTIF"}</Badge></div><p className="mt-2 text-[9px] text-[#697588]">Operator: <b className="text-[#263959]">{row.operatorName ?? "Belum diisi"}</b></p><p className="mt-0.5 text-[9px] text-[#697588]">Jam operasional: <b className="text-[#263959]">Belum tersedia</b></p><p className="mt-0.5 text-[9px] text-[#697588]">Pembaruan: <b className="text-[#263959]">Data terbaru</b></p></div><ArrowRight className="mt-5 size-3.5 shrink-0 text-[#8490a1]" /></Link>) : <div className="rounded-2xl border border-border bg-card"><EmptyState description="Unit excavator yang terdaftar akan muncul di sini." title="Belum ada excavator" /></div>}</div>
      {canManage ? <Button asChild className="h-10 w-full rounded-lg bg-[#1454c4] text-xs"><Link href="/dashboard/excavators/new"><Plus className="size-4" /> Tambah Excavator</Link></Button> : null}
    </section>
  );
}

export function MobileInformationScreen({ items }: { items: InformationRow[] }) {
  const colors = ["#198754", "#ed8a13", "#d83232", "#2259c4"];
  const categoryLabel = (category: string) => ({ ACTIVITY: "Kegiatan", NOTICE: "Pemberitahuan", COMPLAINT: "Keluhan", INCIDENT: "Insiden" }[category] ?? category.replaceAll("_", " "));
  return (
    <section className="space-y-3 md:hidden">
      <div className="flex items-center gap-5 border-b border-[#dfe4ec] pb-2 text-[10px] font-semibold text-[#7b8491]"><span className="border-b-2 border-[#1454c4] pb-2 text-[#1454c4]">Semua</span><span>Kegiatan</span><span>Keluhan</span><span>Pemberitahuan</span></div>
      {items.length ? <div className="space-y-0 rounded-xl border border-[#dfe4ec] bg-white px-3 shadow-sm">{items.slice(0, 6).map((item, index) => <Link className="relative flex gap-3 border-b border-[#eef0f4] py-3.5 last:border-0" href={`/dashboard/information/${item.id}`} key={item.id}><span className="relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: colors[index % colors.length] }}><MapPin className="size-3.5" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><Badge className="border-0 bg-[#e9f7ee] px-1.5 py-0.5 text-[8px] text-[#27834b]" variant="outline">{categoryLabel(item.category)}</Badge><time className="text-[8px] text-[#7b8491]">{item.time ?? item.reportedAt.toLocaleString("id-ID")}</time></div><p className="mt-2 text-[10px] font-bold text-[#263959]">{item.description}</p><p className="mt-1 text-[9px] text-[#697588]">Lokasi: {item.blockCode}</p></div><div className="mt-1 size-11 rounded-lg bg-[#eef3f8]" /></Link>)}</div> : <div className="rounded-2xl border border-border bg-card"><EmptyState description="Kegiatan, keluhan, dan pemberitahuan lapangan akan muncul di sini." title="Belum ada informasi" /></div>}
      <Button asChild className="h-10 w-full rounded-lg bg-[#1454c4] text-xs"><Link href="/dashboard/information/new"><Plus className="size-4" /> Buat Informasi Baru</Link></Button>
    </section>
  );
}
