"use client";

import { usePathname } from "next/navigation";
import { UserMenu } from "./user-menu";
import Link from "next/link";
import { Bell, ChevronLeft, CloudUpload, Menu, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { accessRoleLabel, getAccessRole, type AppNavItem } from "./navigation";
import { mobileRoleTokens } from "@/src/lib/ui/mobile-tokens";

type MobileHeaderProps = {
  items: AppNavItem[];
  userName: string;
  userEmail: string;
  unreadNotificationCount: number;
};

function mobileRouteTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard/blocks")) return pathname.includes("/") && pathname.split("/").length > 3 ? "Detail Blok" : "Peta Blok";
  if (pathname.startsWith("/dashboard/inspections")) return pathname.endsWith("/new") ? "Input Pemeriksaan" : "Pemeriksaan Blok";
  if (pathname.startsWith("/dashboard/excavators")) return pathname.endsWith("/new") ? "Tambah Excavator" : "Excavator";
  if (pathname.startsWith("/dashboard/information")) return pathname.endsWith("/new") ? "Informasi Baru" : "Informasi Harian";
  if (pathname.startsWith("/dashboard/finance")) return "Keuangan";
  if (pathname.startsWith("/dashboard/dues")) return "Iuran & Pembayaran";
  if (pathname.startsWith("/dashboard/budgets")) return "Alokasi Anggaran";
  if (pathname.startsWith("/dashboard/realizations")) return "Realisasi & Laporan";
  if (pathname.startsWith("/dashboard/reports")) return "Laporan";
  return "SATGAS DESA SEJOLI";
}

export function MobileHeader({ items, userName, userEmail, unreadNotificationCount }: MobileHeaderProps) {
  const pathname = usePathname();
  const role = getAccessRole(items);
  const roleTokens = mobileRoleTokens(role);
  const label = accessRoleLabel(role);
  const isDashboard = pathname === "/dashboard";

  if (!isDashboard) {
    return (
      <header className={`flex items-center justify-between px-4 py-3 text-white shadow-[0_4px_18px_rgba(16,50,115,0.2)] md:hidden ${roleTokens.header}`}>
        <Link aria-label="Kembali ke dashboard" className="rounded-lg p-1.5 text-white/90 hover:bg-white/10" href="/dashboard"><ChevronLeft aria-hidden="true" className="size-5" /></Link>
        <p className="text-sm font-bold tracking-tight">{mobileRouteTitle(pathname)}</p>
        <div className="flex items-center gap-1">
          <button aria-label="Buka filter" className="rounded-lg p-1.5 text-white/90 hover:bg-white/10" onClick={() => toast.info("Gunakan filter pada area daftar halaman ini.")} type="button"><SlidersHorizontal aria-hidden="true" className="size-4" /></button>
          <button aria-label="Sinkronisasi data" className="rounded-lg p-1.5 text-white/90 hover:bg-white/10" onClick={() => toast.success("Data sudah menggunakan pembaruan terbaru.")} type="button"><CloudUpload aria-hidden="true" className="size-4" /></button>
        </div>
      </header>
    );
  }

  return (
    <header className={`flex items-center justify-between px-4 py-3 text-white shadow-[0_4px_18px_rgba(16,50,115,0.2)] md:hidden ${roleTokens.header}`}>
      <div className="flex items-center gap-2.5">
        <button aria-label="Buka navigasi" className="rounded-lg p-1.5 text-white/85 hover:bg-white/10" onClick={() => toast.info("Navigasi tersedia melalui menu bawah.")} type="button"><Menu aria-hidden="true" className="size-5" /></button>
        <div className="grid size-9 place-items-center rounded-xl border border-white/20 bg-white/10"><ShieldCheck aria-hidden="true" className="size-5 text-amber-300" /></div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-100">SATGAS DESA SEJOLI</p>
          <p className="mt-0.5 text-[9px] font-bold text-amber-200">{label}</p>
        </div>
      </div>
      <div className="flex items-center gap-1"><Link aria-label="Notifications" className="relative rounded-lg p-2 text-white/90 hover:bg-white/10" href="/dashboard/notifications"><Bell aria-hidden="true" className="size-4 stroke-[1.8]" />{unreadNotificationCount > 0 ? <Badge className="absolute -right-0.5 -top-0.5 min-w-4 justify-center border-0 bg-[#ef4444] px-1 text-[9px] text-white" variant="default">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</Badge> : null}</Link><UserMenu userEmail={userEmail} userName={userName} triggerClassName="border-white/20 bg-white/10 text-white hover:bg-white/20" /></div>
    </header>
  );
}
