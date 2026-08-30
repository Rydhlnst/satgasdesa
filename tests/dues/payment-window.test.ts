import { describe, expect, it } from "vitest";

import { assertMonthlyPaymentDate, getMonthlyDueDay } from "@/src/features/dues/config";

describe("monthly payment window", () => {
  it("accepts payment dates from the 1st through the 10th", () => {
    expect(() => assertMonthlyPaymentDate("2026-08-01")).not.toThrow();
    expect(() => assertMonthlyPaymentDate("2026-08-10")).not.toThrow();
  });

  it("rejects payment dates outside the monthly window", () => {
    expect(() => assertMonthlyPaymentDate("2026-08-11")).toThrow("Pembayaran bulanan hanya dapat dicatat dari tanggal 1 sampai 10 setiap bulan.");
  });

  it("uses day 10 as the safe default deadline", () => {
    expect(getMonthlyDueDay()).toBe(10);
  });
});
