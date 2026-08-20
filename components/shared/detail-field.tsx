import type { ReactNode } from "react";

type DetailFieldProps = { label: string; value: ReactNode; className?: string };

export function DetailField({ label, value, className }: DetailFieldProps) {
  return <div className={className}><dt className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</dt><dd className="mt-2 text-sm font-semibold text-foreground">{value}</dd></div>;
}
