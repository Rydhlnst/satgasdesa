import { describe, expect, it } from "vitest";

import { isMonthlyPaymentDate } from "@/mobile/src/date-validation";
import { formatMoneyInput, money, parseMoneyInput } from "@/mobile/src/lib/format";

describe("mobile Rupiah formatting", () => {
  it("uses Indonesian separators, Rp. prefix, and two decimals", () => {
    expect(money(10_000_000)).toBe("Rp. 10.000.000,00");
    expect(money(5_000_000.5)).toBe("Rp. 5.000.000,50");
  });

  it("keeps currency input numeric for API payloads", () => {
    expect(formatMoneyInput("10000000")).toBe("Rp. 10.000.000,00");
    expect(parseMoneyInput("Rp. 10.000.000,00")).toBe("10000000");
  });
});

describe("monthly payment date validation", () => {
  it("accepts only days 1 through 10 in the due period", () => {
    expect(isMonthlyPaymentDate("2026-08-01", "2026-08")).toBe(true);
    expect(isMonthlyPaymentDate("2026-08-10", "2026-08")).toBe(true);
    expect(isMonthlyPaymentDate("2026-08-11", "2026-08")).toBe(false);
    expect(isMonthlyPaymentDate("2026-07-10", "2026-08")).toBe(false);
  });
});
