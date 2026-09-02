import { describe, expect, it } from "vitest";

import { allocationControlStatus, allocationPercent } from "@/src/features/budgets/allocation-controls";

describe("budget allocation controls", () => {
  it("aggregates percentages from the allocation amount", () => {
    expect(allocationPercent(20_000_000, 40_000_000)).toBe(50);
  });

  it("flags spending ahead of physical progress", () => {
    expect(allocationControlStatus({ allocatedAmount: 50_000_000, approvedRealization: 25_000_000, progressPercentage: 30 })).toBe("POTENTIAL_OVER_BUDGET");
  });

  it("flags physical progress ahead of spending", () => {
    expect(allocationControlStatus({ allocatedAmount: 50_000_000, approvedRealization: 15_000_000, progressPercentage: 50 })).toBe("DELAYED_ABSORPTION");
  });
});
