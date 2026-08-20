import type { ReactNode } from "react";

type DataTableToolbarProps = { children: ReactNode; description?: string };

export function DataTableToolbar({ children, description }: DataTableToolbarProps) {
  return <div className="space-y-3 border-y border-border py-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">{children}</div>{description ? <p className="text-xs text-muted-foreground">{description}</p> : null}</div>;
}
