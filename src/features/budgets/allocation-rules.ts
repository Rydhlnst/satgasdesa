export function assertRealizationAmountAvailable(remainingAllocation: number, requestedAmount: number): void {
  if (requestedAmount > remainingAllocation) throw new Error("Realization amount exceeds the remaining allocation. Create an authorized budget adjustment first.");
}
