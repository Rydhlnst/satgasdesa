import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
};

export function MetricCard({ label, value, description, icon: Icon }: MetricCardProps) {
  return (
    <Card className="border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <CardTitle className="text-xs font-semibold tracking-[0.08em] text-muted-foreground">{label}</CardTitle>
        {Icon ? <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-4 stroke-[1.8]" /></span> : null}
      </CardHeader>
      <CardContent>
        <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        {description ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  );
}
