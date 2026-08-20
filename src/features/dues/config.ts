export const DUE_AMOUNTS_RUPIAH = {
  MONTHLY: 10_000_000,
  ROAD_ENTRY: 5_000_000,
} as const;

export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "OTHER"] as const;

export function isRoadEntryDueAutomationEnabled(): boolean {
  return process.env.ROAD_ENTRY_DUE_AUTOMATION_ENABLED === "true";
}

export function getMonthlyDueDay(): number {
  const configured = Number.parseInt(process.env.MONTHLY_DUE_DAY ?? "10", 10);
  return Number.isInteger(configured) && configured >= 1 && configured <= 31 ? configured : 10;
}
