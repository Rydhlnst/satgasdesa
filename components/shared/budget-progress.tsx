import { Progress } from "@/components/ui/progress";

type BudgetProgressProps = { percentage: number; label?: string };

export function BudgetProgress({ percentage, label = "Serapan anggaran" }: BudgetProgressProps) {
  const safePercentage = Math.min(100, Math.max(0, percentage));
  return <div className="space-y-2"><div className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><span className="font-semibold tabular-nums">{safePercentage}%</span></div><Progress aria-label={label} value={safePercentage} /></div>;
}
