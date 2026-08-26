import { describe, expect, it } from "vitest";

import { assertFinancialTransactionApprover } from "@/src/features/finance/service";

describe("financial transaction separation of duties", () => {
  it("rejects self-approval", () => {
    expect(() => assertFinancialTransactionApprover("user-1", "user-1")).toThrow("cannot be approved by its creator");
    expect(() => assertFinancialTransactionApprover("user-1", "user-2")).not.toThrow();
  });
});
