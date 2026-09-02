export type AllocationControlStatus = "OVER_ALLOCATED" | "POTENTIAL_OVER_BUDGET" | "DELAYED_ABSORPTION" | "ON_TRACK";

export function allocationPercent(amount: number, total: number): number {
  return total > 0 ? Math.round((amount / total) * 10_000) / 100 : 0;
}

export function allocationControlStatus(input: { allocatedAmount: number; approvedRealization: number; progressPercentage: number }): AllocationControlStatus {
  const absorptionPercentage = allocationPercent(input.approvedRealization, input.allocatedAmount);
  if (input.approvedRealization > input.allocatedAmount) return "OVER_ALLOCATED";
  if (absorptionPercentage > input.progressPercentage) return "POTENTIAL_OVER_BUDGET";
  if (input.progressPercentage > absorptionPercentage) return "DELAYED_ABSORPTION";
  return "ON_TRACK";
}

export function allocationControlLabel(status: AllocationControlStatus): string {
  if (status === "OVER_ALLOCATED") return "Melebihi alokasi";
  if (status === "POTENTIAL_OVER_BUDGET") return "Potensi over budget";
  if (status === "DELAYED_ABSORPTION") return "Serapan tertinggal";
  return "Sesuai progres";
}
