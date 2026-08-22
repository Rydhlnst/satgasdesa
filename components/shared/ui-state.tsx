import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, CircleOff, Info, LoaderCircle, SearchX, ShieldAlert, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { UI_MESSAGES } from "@/src/lib/ui/messages";

export type StateTone = "neutral" | "success" | "warning" | "danger" | "workflow";
export type StateVariant = "inline" | "card" | "page";

type StatePanelProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  tone?: StateTone;
  variant?: StateVariant;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  action?: ReactNode;
  className?: string;
};

const toneClasses: Record<StateTone, string> = {
  neutral: "bg-primary/5 text-primary ring-primary/10",
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-700 ring-amber-500/15 dark:text-amber-300",
  danger: "bg-destructive/10 text-destructive ring-destructive/15",
  workflow: "bg-violet-500/10 text-violet-700 ring-violet-500/15 dark:text-violet-300",
};

const variantClasses: Record<StateVariant, string> = {
  inline: "min-h-32 p-5",
  card: "min-h-56 rounded-2xl border border-border/70 bg-card p-8 shadow-sm",
  page: "mx-auto min-h-[360px] max-w-xl rounded-2xl border border-border/70 bg-card p-8 shadow-sm sm:p-12",
};

export function StatePanel({ title, description, icon: Icon = Info, tone = "neutral", variant = "card", primaryAction, secondaryAction, action, className }: StatePanelProps) {
  const isDanger = tone === "danger";
  const actions = primaryAction || secondaryAction || action ? <div className="flex flex-wrap items-center justify-center gap-3 pt-2">{primaryAction ?? action}{secondaryAction}</div> : null;

  return (
    <section aria-live={isDanger ? "assertive" : "polite"} className={cn("flex w-full flex-col items-center justify-center text-center", variantClasses[variant], className)} data-state-tone={tone} data-state-variant={variant} role={isDanger ? "alert" : "status"}>
      <span className={cn("mb-4 grid size-12 place-items-center rounded-2xl ring-1", toneClasses[tone])}><Icon aria-hidden="true" className="size-5" /></span>
      <h2 className="font-heading text-base font-bold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {actions}
    </section>
  );
}

type MessageStateProps = Omit<StatePanelProps, "tone" | "title" | "description"> & { title?: string; description?: string };

export function LoadingState({ icon: Icon = LoaderCircle, title = "Memuat data", description = "Mohon tunggu sebentar.", variant = "inline", ...props }: MessageStateProps) {
  return <StatePanel {...props} description={description} icon={Icon} title={title} tone="neutral" variant={variant} />;
}

export function EmptyState({ icon: Icon = Info, title = UI_MESSAGES.states.empty.title, description = UI_MESSAGES.states.empty.description, variant = "card", ...props }: MessageStateProps) {
  return <StatePanel {...props} description={description} icon={Icon} title={title} tone="neutral" variant={variant} />;
}

export function NoResultsState({ icon: Icon = SearchX, title = UI_MESSAGES.states.noResults.title, description = UI_MESSAGES.states.noResults.description, variant = "card", ...props }: MessageStateProps) {
  return <StatePanel {...props} description={description} icon={Icon} title={title} tone="neutral" variant={variant} />;
}

export function OfflineState({ icon: Icon = WifiOff, title = UI_MESSAGES.states.offline.title, description = UI_MESSAGES.states.offline.description, variant = "page", ...props }: MessageStateProps) {
  return <StatePanel {...props} description={description} icon={Icon} title={title} tone="warning" variant={variant} />;
}

export function ErrorState({ icon: Icon = AlertTriangle, title = UI_MESSAGES.states.error.title, description = UI_MESSAGES.states.error.description, variant = "card", ...props }: MessageStateProps) {
  return <StatePanel {...props} description={description} icon={Icon} title={title} tone="danger" variant={variant} />;
}

export function NotFoundState({ icon: Icon = CircleOff, title = UI_MESSAGES.states.notFound.title, description = UI_MESSAGES.states.notFound.description, variant = "page", ...props }: MessageStateProps) {
  return <StatePanel {...props} description={description} icon={Icon} title={title} tone="neutral" variant={variant} />;
}

export function UnauthorizedState({ icon: Icon = ShieldAlert, title = UI_MESSAGES.states.unauthorized.title, description = UI_MESSAGES.states.unauthorized.description, variant = "page", ...props }: MessageStateProps) {
  return <StatePanel {...props} description={description} icon={Icon} title={title} tone="warning" variant={variant} />;
}

export function SuccessState({ icon: Icon = CheckCircle2, title = UI_MESSAGES.states.success.title, description = UI_MESSAGES.states.success.description, variant = "card", ...props }: MessageStateProps) {
  return <StatePanel {...props} description={description} icon={Icon} title={title} tone="success" variant={variant} />;
}
