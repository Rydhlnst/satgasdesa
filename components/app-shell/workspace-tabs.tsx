"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { AppNavItem } from "./navigation";

type WorkspaceTabsProps = {
  items: AppNavItem[];
};

const GROUPS = [
  { value: "overview", label: "Ringkasan", href: "/dashboard", routes: ["/dashboard"] },
  { value: "operational", label: "Operasional", href: "/dashboard/blocks", routes: ["/dashboard/blocks", "/dashboard/excavators", "/dashboard/inspections", "/dashboard/information", "/dashboard/block-managers"] },
  { value: "finance", label: "Keuangan", href: "/dashboard/finance", routes: ["/dashboard/finance", "/dashboard/dues", "/dashboard/payments", "/dashboard/budgets", "/dashboard/realizations", "/dashboard/reports"] },
  { value: "governance", label: "Tata kelola", href: "/dashboard/notifications", routes: ["/dashboard/notifications", "/dashboard/audit", "/dashboard/settings"] },
] as const;

function isVisible(items: AppNavItem[], routes: readonly string[]): boolean {
  return routes.some((route) => route === "/dashboard" || items.some((item) => item.href === route || item.href.startsWith(`${route}/`)));
}

function activeGroup(pathname: string): string {
  return GROUPS.find((group) => group.routes.some((route) => route === "/dashboard" ? pathname === route : pathname.startsWith(route)))?.value ?? "overview";
}

export function WorkspaceTabs({ items }: WorkspaceTabsProps) {
  const pathname = usePathname();
  const visibleGroups = GROUPS.filter((group) => isVisible(items, group.routes));

  return <Tabs className="w-full" value={activeGroup(pathname)}><TabsList className="no-scrollbar w-full justify-start gap-1 overflow-x-auto rounded-lg border-t border-border bg-transparent p-0" variant="line">{visibleGroups.map((group) => <TabsTrigger asChild className="h-10 flex-none px-3 text-[11px] tracking-[0.12em] sm:px-4" key={group.value} value={group.value}><Link href={group.href}>{group.label}</Link></TabsTrigger>)}</TabsList></Tabs>;
}
