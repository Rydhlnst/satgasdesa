"use client";

import { MoreHorizontal, ClipboardCheck, FileText, MapPinned } from "lucide-react";

import { AppNavLink } from "./nav-link";
import type { AppNavItem } from "./navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import Link from "next/link";

type MobileBottomNavProps = {
  items: AppNavItem[];
};

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const mobileItems = items.slice(0, 4);
  const secondaryItems = items.slice(4);
  const inspectionHref = items.find((item) => item.href === "/dashboard/inspections")?.href;
  const informationHref = items.find((item) => item.href === "/dashboard/information")?.href;
  const blocksHref = items.find((item) => item.href === "/dashboard/blocks")?.href;

  return (
    <nav aria-label="Navigasi mobile" className="fixed inset-x-0 bottom-0 z-20 flex min-h-16 items-stretch border-t border-border bg-background/95 px-1.5 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_-12px_hsl(var(--foreground)/0.3)] backdrop-blur md:hidden">
      {mobileItems.map((item) => <AppNavLink item={item} key={item.href} variant="mobile" />)}
      <Sheet>
        <SheetTrigger asChild><Button aria-label="Buka menu lainnya" className="min-h-14 flex-1 flex-col gap-1 rounded-xl border border-transparent px-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground" variant="ghost"><MoreHorizontal aria-hidden="true" className="size-4" /><span className="flex min-h-6 items-start justify-center text-center leading-3">Lainnya</span></Button></SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-3xl border-border bg-background px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
          <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
          <SheetHeader className="px-1 pb-4 pt-0"><SheetTitle className="text-left text-base tracking-[0.12em]">Menu lainnya</SheetTitle></SheetHeader>
          <div className="space-y-7">
            <section className="space-y-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Aksi cepat</p><div className="grid grid-cols-3 gap-2">{inspectionHref ? <Button asChild className="h-auto min-h-20 flex-col gap-2 rounded-2xl border-border bg-card px-2 text-[10px] uppercase tracking-[0.08em]" variant="outline"><Link href={`${inspectionHref}/new`}><ClipboardCheck aria-hidden="true" className="size-5" />Inspeksi</Link></Button> : null}{informationHref ? <Button asChild className="h-auto min-h-20 flex-col gap-2 rounded-2xl border-border bg-card px-2 text-[10px] uppercase tracking-[0.08em]" variant="outline"><Link href={`${informationHref}/new`}><FileText aria-hidden="true" className="size-5" />Informasi</Link></Button> : null}{blocksHref ? <Button asChild className="h-auto min-h-20 flex-col gap-2 rounded-2xl border-border bg-card px-2 text-[10px] uppercase tracking-[0.08em]" variant="outline"><Link href={blocksHref}><MapPinned aria-hidden="true" className="size-5" />Blok</Link></Button> : null}</div></section>
            <section className="space-y-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Modul</p><div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-3">{secondaryItems.map((item) => <AppNavLink className="w-full flex-none min-h-16 rounded-2xl border-border bg-card px-3 text-[10px]" item={item} key={item.href} variant="mobile" />)}</div></section>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
