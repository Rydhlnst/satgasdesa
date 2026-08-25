import { describe, expect, it } from "vitest";

import { exportMonthlyReportPdf } from "@/src/features/reports/export";
import type { MonthlyReport } from "@/src/features/reports/service";

const report: MonthlyReport = {
  periodKey: "2026-08",
  operational: { inspections: 2, excavatorMovements: 3, totalInformation: 4, complaints: 1, incidents: 1, prospectiveManagers: 0, notices: 2, openInformation: 2, byStatus: {}, byCategory: {}, byPriority: {}, byBlock: [{ blockCode: "BLK-01", blockName: "Sejoli", total: 4, open: 2 }] },
  financial: { openingBalance: 1_000_000, income: 500_000, expenses: 250_000, paymentsReceived: 500_000, duesObligation: 600_000, receivables: 100_000, outstandingReceivables: 100_000, closingBalance: 1_250_000, reconciliation: { paymentLedger: 500_000, paymentCashIn: 500_000, realizationLedger: 250_000, realizationCashOut: 250_000, reconciled: true } },
  budget: { allocation: 2_000_000, realization: 250_000, remainingAllocation: 1_750_000, absorptionPercentage: 12.5, overAllocatedRealizations: 0 },
};

describe("monthly report export", () => {
  it("produces a non-empty PDF document", async () => {
    const pdf = await exportMonthlyReportPdf(report);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(500);
  });
});
