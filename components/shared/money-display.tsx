import { cn } from "@/lib/utils";

type MoneyDisplayProps = {
  value: number;
  className?: string;
};

export function MoneyDisplay({ value, className }: MoneyDisplayProps) {
  return <span className={cn("tabular-nums", className)}>Rp {new Intl.NumberFormat("id-ID").format(value)}</span>;
}
