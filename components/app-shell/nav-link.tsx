"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpenCheck, ClipboardCheck, FileBarChart, HardHat, History, Landmark, LayoutDashboard, ListChecks, MessagesSquare, ReceiptText, Settings, UsersRound, WalletCards, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SidebarMenuButton } from "@/components/ui/sidebar";

import type { AppNavItem, NavIconName } from "./navigation";

const icons: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  blocks: BookOpenCheck,
  excavators: HardHat,
  inspections: ClipboardCheck,
  information: MessagesSquare,
  dues: WalletCards,
  finance: Landmark,
  budgets: ListChecks,
  realizations: ReceiptText,
  reports: FileBarChart,
  notifications: Bell,
  audit: History,
  managers: UsersRound,
  settings: Settings,
};

type AppNavLinkProps = {
  className?: string;
  item: AppNavItem;
  variant: "sidebar" | "mobile";
};

export function AppNavLink({ className, item, variant }: AppNavLinkProps) {
  const pathname = usePathname();
  const Icon = icons[item.icon];
  const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);

  if (variant === "sidebar") {
    return (
      <SidebarMenuButton asChild className={cn("h-auto rounded-lg px-3 py-2.5 text-xs font-semibold uppercase tracking-wide", isActive ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground", className)} isActive={isActive} tooltip={item.label}>
        <Link aria-current={isActive ? "page" : undefined} href={item.href}>
          <Icon aria-hidden="true" className={cn("size-4 shrink-0 stroke-[1.8]", isActive ? "text-sidebar-primary" : "text-current")} />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    );
  }

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground",
        isActive && "border-border bg-muted text-foreground",
        "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent px-1 text-[8px] font-semibold tracking-wide",
        className,
      )}
      href={item.href}
    >
      <Icon aria-hidden="true" className={cn("size-4 shrink-0 stroke-[1.8]", isActive ? "text-primary" : "text-current")} />
      <span className="flex min-h-6 items-start justify-center text-center leading-3">{item.label}</span>
    </Link>
  );
}
