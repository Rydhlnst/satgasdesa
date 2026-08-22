import type { ReactNode } from "react";

import { AppSidebar } from "./app-sidebar";
import { DesktopHeader } from "./desktop-header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { MobileHeader } from "./mobile-header";
import { getAccessRole, type AppNavItem } from "./navigation";
import { NetworkStatus } from "@/components/pwa/network-status";

type AppShellProps = {
  children: ReactNode;
  items: AppNavItem[];
  userName: string;
  userEmail: string;
  unreadNotificationCount: number;
};

export function AppShell({ children, items, userName, userEmail, unreadNotificationCount }: AppShellProps) {
  const role = getAccessRole(items);
  return (
    <div className="h-screen overflow-hidden bg-background" data-role={role}>
      <NetworkStatus />
      <div className="h-full">
        <AppSidebar items={items} />
        <div className="no-scrollbar h-full min-w-0 overflow-y-auto md:pl-64">
          <DesktopHeader items={items} unreadNotificationCount={unreadNotificationCount} userEmail={userEmail} userName={userName} />
          <MobileHeader items={items} unreadNotificationCount={unreadNotificationCount} userEmail={userEmail} userName={userName} />
          {children}
        </div>
      </div>
      <MobileBottomNav items={items} userEmail={userEmail} userName={userName} />
    </div>
  );
}
