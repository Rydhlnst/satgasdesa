import { describe, expect, it } from "vitest";

import { assertRealizationAmountAvailable } from "@/src/features/budgets/allocation-rules";

describe("realization allocation rules", () => {
  it("allows a realization that exactly consumes the remaining allocation", () => {
    expect(() => assertRealizationAmountAvailable(250_000, 250_000)).not.toThrow();
  });

  it("blocks a realization that would exceed the approved allocation", () => {
    expect(() => assertRealizationAmountAvailable(250_000, 250_001)).toThrow("exceeds the remaining allocation");
  });
});
