export const DUE_AMOUNTS_RUPIAH = {
  MONTHLY: 10_000_000,
  ROAD_ENTRY: 5_000_000,
} as const;

export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "QRIS", "OTHER"] as const;

export const MONTHLY_PAYMENT_WINDOW = { startDay: 1, endDay: 10 } as const;

export function assertMonthlyPaymentDate(paymentDate: string): void {
  const day = Number(paymentDate.slice(-2));
  if (!Number.isInteger(day) || day < MONTHLY_PAYMENT_WINDOW.startDay || day > MONTHLY_PAYMENT_WINDOW.endDay) {
    throw new Error("Pembayaran bulanan hanya dapat dicatat dari tanggal 1 sampai 10 setiap bulan.");
  }
}

export function isRoadEntryDueAutomationEnabled(): boolean {
  return process.env.ROAD_ENTRY_DUE_AUTOMATION_ENABLED === "true";
}

export function getMonthlyDueDay(): number {
  const configured = Number.parseInt(process.env.MONTHLY_DUE_DAY ?? "10", 10);
  return Number.isInteger(configured) && configured >= MONTHLY_PAYMENT_WINDOW.startDay && configured <= MONTHLY_PAYMENT_WINDOW.endDay ? configured : MONTHLY_PAYMENT_WINDOW.endDay;
}
