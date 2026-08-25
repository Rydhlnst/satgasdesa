import { describe, expect, it } from "vitest";

import { PAYMENT_METHODS } from "@/src/features/dues/config";
import { recordDuePaymentSchema } from "@/src/features/dues/schema";

describe("payment methods", () => {
  it("supports QRIS while preserving server-side validation", () => {
    expect(PAYMENT_METHODS).toContain("QRIS");
    expect(recordDuePaymentSchema.safeParse({
      dueId: "11111111-1111-4111-8111-111111111111",
      idempotencyKey: "22222222-2222-4222-8222-222222222222",
      payerName: "PT Sejoli",
      paymentDate: "2026-08-25",
      amount: 100_000,
      method: "QRIS",
    }).success).toBe(true);
  });
});
