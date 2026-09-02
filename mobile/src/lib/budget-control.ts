export type BudgetControlStatus = "OVER_ALLOCATED" | "POTENTIAL_OVER_BUDGET" | "DELAYED_ABSORPTION" | "ON_TRACK";

export function budgetControlLabel(status: string): string {
  if (status === "OVER_ALLOCATED") return "Melebihi alokasi";
  if (status === "POTENTIAL_OVER_BUDGET") return "Potensi over budget";
  if (status === "DELAYED_ABSORPTION") return "Serapan tertinggal";
  return "Sesuai progres";
}

export function budgetControlTone(status: string): "green" | "red" | "orange" | "blue" | "gray" {
  if (status === "OVER_ALLOCATED" || status === "POTENTIAL_OVER_BUDGET") return "red";
  if (status === "DELAYED_ABSORPTION") return "orange";
  return status === "ON_TRACK" ? "green" : "gray";
}
