"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

import { AppNavLink } from "./nav-link";
import type { AppNavItem } from "./navigation";
import { ShieldCheck } from "lucide-react";

type AppSidebarProps = {
  items: AppNavItem[];
};

export function AppSidebar({ items }: AppSidebarProps) {
  return (
    <SidebarProvider className="fixed inset-y-0 left-0 z-30 hidden h-screen w-64 md:block">
      <Sidebar collapsible="none" className="h-full w-64 border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-sidebar-accent text-sidebar-primary shadow-sm">
            <ShieldCheck aria-hidden="true" className="size-5 stroke-[1.8]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sidebar-primary">SATGAS</p>
            <p className="mt-1 font-heading text-lg font-semibold uppercase tracking-wide text-sidebar-foreground">Desa Sejoli</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="overflow-hidden px-3 py-5">
        <nav aria-label="Primary navigation" className="h-full">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="h-8 px-3 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">Navigasi utama</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => <SidebarMenuItem key={item.href}><AppNavLink item={item} variant="sidebar" /></SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border bg-sidebar/80 px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">Operasional internal</p>
      </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}
