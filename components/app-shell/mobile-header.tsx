import { UserMenu } from "./user-menu";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type MobileHeaderProps = {
  userName: string;
  userEmail: string;
  unreadNotificationCount: number;
};

export function MobileHeader({ userName, userEmail, unreadNotificationCount }: MobileHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-background/95 px-4 py-4 shadow-sm backdrop-blur md:hidden">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">SATGAS</p>
        <p className="font-heading text-lg font-semibold uppercase tracking-wide text-foreground">Desa Sejoli</p>
      </div>
      <div className="flex items-center gap-2"><Link aria-label="Notifications" className="relative rounded-lg border border-transparent p-2 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground" href="/dashboard/notifications"><Bell aria-hidden="true" className="size-4 stroke-[1.8]" />{unreadNotificationCount > 0 ? <Badge className="absolute -right-2 -top-2 min-w-5 justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground" variant="default">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</Badge> : null}</Link><UserMenu userEmail={userEmail} userName={userName} /></div>
    </header>
  );
}
