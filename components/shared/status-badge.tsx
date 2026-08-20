import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { getUiLabel } from "@/src/lib/ui-labels";
import { cn } from "@/lib/utils";

export type StatusSemantic = "success" | "info" | "warning" | "danger" | "neutral";

export type StatusBadgeProps = {
  status: string;
  label?: string;
  semantic?: StatusSemantic;
  variant?: ComponentProps<typeof Badge>["variant"];
};

function defaultVariant(status: string): ComponentProps<typeof Badge>["variant"] {
  if (["STOPPED", "INACTIVE", "EXITED", "REJECTED", "URGENT", "HIGH", "OVERDUE", "REVERSED"].includes(status)) return "destructive";
  if (["ACTIVE", "PAID", "APPROVED", "SAH", "COMPLETED", "CLOSED"].includes(status)) return "default";
  if (["PARTIAL", "IN_PROGRESS", "VERIFIED", "SUBMITTED", "RECEIVED", "MEDIUM"].includes(status)) return "secondary";
  return "outline";
}

function defaultSemantic(status: string): StatusSemantic {
  if (["ACTIVE", "APPROVED", "COMPLETED", "CLOSED", "PAID", "SAH"].includes(status)) return "success";
  if (["SUBMITTED", "RECEIVED", "VERIFIED", "MEDIUM"].includes(status)) return "info";
  if (["PARTIAL", "IN_PROGRESS", "OVER_ALLOCATION"].includes(status)) return "warning";
  if (["STOPPED", "REJECTED", "REVERSED", "URGENT", "HIGH", "OVERDUE"].includes(status)) return "danger";
  return "neutral";
}

export function StatusBadge({ status, label, semantic, variant }: StatusBadgeProps) {
  const tone = semantic ?? defaultSemantic(status);
  return <Badge className={cn("rounded-full border px-2.5 py-1 tracking-[0.12em]", tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300", tone === "info" && "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300", tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300", tone === "danger" && "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300", tone === "neutral" && "border-border bg-muted text-muted-foreground")} variant={variant ?? defaultVariant(status)}>{label ?? getUiLabel(status)}</Badge>;
}
