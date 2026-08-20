import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { APP_NAV_ITEMS } from "@/components/app-shell/navigation";
import { hasPermission, requireAuth } from "@/src/lib/permissions/authorize";
import { getUnreadNotificationCount } from "@/src/features/notifications/service";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await requireAuth();
  const [visibleItems, unreadNotificationCount] = await Promise.all([
    Promise.all(APP_NAV_ITEMS.map(async (item) => ({ item, visible: !item.permission || (await hasPermission(session.user.id, item.permission)) }))),
    getUnreadNotificationCount(),
  ]);

  return (
    <AppShell
      items={visibleItems.filter(({ visible }) => visible).map(({ item }) => item)}
      userEmail={session.user.email}
      userName={session.user.name}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </AppShell>
  );
}
