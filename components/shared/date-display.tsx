import { cn } from "@/lib/utils";

type DateDisplayProps = { value: Date | string | number; withTime?: boolean; className?: string };

export function DateDisplay({ value, withTime = false, className }: DateDisplayProps) {
  const date = value instanceof Date ? value : new Date(value);
  return <time className={cn("tabular-nums", className)} dateTime={date.toISOString()}>{new Intl.DateTimeFormat("id-ID", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date)}</time>;
}
