import { describe, expect, it } from "vitest";

import { applyDuePayment, hasMatchingPaymentIdentity, reverseDuePayment } from "@/src/features/dues/payment-rules";

describe("due payment rules", () => {
  const unpaidDue = { amountDue: 1_000_000, amountPaid: 0, status: "UNPAID" as const };

  it("records partial and full payments without exceeding the balance", () => {
    expect(applyDuePayment(unpaidDue, 400_000)).toEqual({ amountPaid: 400_000, status: "PARTIAL" });
    expect(applyDuePayment({ ...unpaidDue, amountPaid: 400_000, status: "PARTIAL" }, 600_000)).toEqual({ amountPaid: 1_000_000, status: "PAID" });
    expect(() => applyDuePayment(unpaidDue, 1_000_001)).toThrow("Jumlah pembayaran melebihi sisa tagihan.");
  });

  it("does not permit payments against a settled due and restores the right state on reversal", () => {
    expect(() => applyDuePayment({ ...unpaidDue, amountPaid: 1_000_000, status: "PAID" }, 1)).toThrow("Iuran ini sudah lunas.");
    expect(reverseDuePayment({ ...unpaidDue, amountPaid: 400_000, status: "PARTIAL" }, 400_000)).toEqual({ amountPaid: 0, status: "UNPAID" });
    expect(reverseDuePayment({ ...unpaidDue, amountPaid: 1_000_000, status: "PAID" }, 400_000)).toEqual({ amountPaid: 600_000, status: "PARTIAL" });
  });

  it("accepts retries only when the idempotency key represents the same payment", () => {
    const payment = { dueId: "due-1", amount: 400_000, paymentDate: "2026-08-25", method: "CASH" };
    expect(hasMatchingPaymentIdentity(payment, { ...payment })).toBe(true);
    expect(hasMatchingPaymentIdentity(payment, { ...payment, amount: 500_000 })).toBe(false);
  });
});
