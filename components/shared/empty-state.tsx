import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <Empty className="min-h-48 border-0 p-8">
      {Icon ? <EmptyMedia variant="icon"><Icon aria-hidden="true" /></EmptyMedia> : null}
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? action : null}
    </Empty>
  );
}
