import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { UserMenu } from "./user-menu";
import { WorkspaceTabs } from "./workspace-tabs";
import type { AppNavItem } from "./navigation";

type DesktopHeaderProps = {
  userName: string;
  userEmail: string;
  unreadNotificationCount: number;
  items: AppNavItem[];
};

export function DesktopHeader({ userName, userEmail, unreadNotificationCount, items }: DesktopHeaderProps) {
  return (
    <header className="sticky top-0 z-20 hidden border-b border-border bg-background/95 px-8 shadow-sm backdrop-blur md:block">
      <div className="flex min-h-20 items-center justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Operasional internal</p>
          <Separator className="mt-3 w-10 bg-primary" />
        </div>
        <div className="flex items-center gap-4">
          <Link aria-label="Notifikasi" className="relative rounded-lg border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground" href="/dashboard/notifications"><Bell aria-hidden="true" className="size-4 stroke-[1.8]" />{unreadNotificationCount > 0 ? <Badge className="absolute -right-2 -top-2 min-w-5 justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground" variant="default">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</Badge> : null}</Link>
          <div className="hidden rounded-lg bg-muted px-3 py-2 text-right lg:block">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <UserMenu userEmail={userEmail} userName={userName} />
        </div>
      </div>
      <WorkspaceTabs items={items} />
    </header>
  );
}
