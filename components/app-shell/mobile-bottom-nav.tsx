"use client";

import { AppNavLink } from "./nav-link";
import { getAccessRole, type AppNavItem } from "./navigation";
import { UserMenu } from "./user-menu";

type MobileBottomNavProps = {
  items: AppNavItem[];
  userName: string;
  userEmail: string;
};

export function MobileBottomNav({ items, userName, userEmail }: MobileBottomNavProps) {
  const role = getAccessRole(items);
  const preferredPaths = role === "PIMPINAN"
    ? ["/dashboard", "/dashboard/blocks", "/dashboard/finance", "/dashboard/budgets"]
    : role === "BENDAHARA"
      ? ["/dashboard", "/dashboard/finance", "/dashboard/budgets", "/dashboard/realizations"]
      : ["/dashboard", "/dashboard/inspections", "/dashboard/excavators", "/dashboard/information"];
  const mobileItems = preferredPaths.map((href) => items.find((item) => item.href === href)).filter((item): item is AppNavItem => Boolean(item)).map((item) => ({ ...item, label: role === "PIMPINAN" && item.href === "/dashboard/blocks" ? "Monitoring" : role === "BENDAHARA" && item.href === "/dashboard/realizations" ? "Pengajuan" : item.href === "/dashboard/inspections" ? "Pemeriksaan" : item.href === "/dashboard/information" ? "Informasi" : item.label }));

  return (
    <nav aria-label="Navigasi mobile" className="fixed inset-x-0 bottom-0 z-20 flex min-h-16 items-stretch border-t border-[#dfe4ec] bg-white/95 px-1.5 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_-12px_rgba(15,35,75,0.35)] backdrop-blur md:hidden">
      {mobileItems.map((item) => <AppNavLink item={item} key={item.href} variant="mobile" />)}
      <div className="flex min-w-0 flex-1 items-stretch">
        <UserMenu navLabel="Profil" triggerClassName="border-transparent bg-transparent text-muted-foreground hover:bg-[#f1f5fb] hover:text-foreground" userEmail={userEmail} userName={userName} />
      </div>
    </nav>
  );
}
