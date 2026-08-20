import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 px-4 py-8 text-foreground sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-32 size-96 rounded-full bg-sidebar-primary/10 blur-3xl" />
      <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <ShieldCheck aria-hidden="true" className="size-6 stroke-[1.8]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">SATGAS</p>
            <p className="mt-1 font-heading text-xl font-semibold uppercase tracking-wide">Desa Sejoli</p>
          </div>
        </div>
        <Card className="rounded-2xl border-border/70 bg-card/95 shadow-xl shadow-foreground/10 backdrop-blur">
          <CardHeader className="px-6 pb-2 pt-8 sm:px-8">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="mt-2 text-sm leading-relaxed">{description}</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8 sm:px-8">{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
