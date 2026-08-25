import { and, eq, gte, inArray, lt } from "drizzle-orm";

import { getDb } from "@/src/db";
import { block } from "@/src/db/schema/blocks";
import { budgetGroup, budgetItem, budgetPeriod, realizationRequest } from "@/src/db/schema/budgets";
import { dailyInformation } from "@/src/db/schema/daily-information";
import { due, duePayment } from "@/src/db/schema/dues";
import { excavatorMovement } from "@/src/db/schema/excavators";
import { financialTransaction } from "@/src/db/schema/finance";
import { inspection } from "@/src/db/schema/inspections";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { nextJakartaDay, startOfJakartaDay } from "@/src/lib/date-range";

import { monthlyReportPeriodSchema } from "./schema";

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export type MonthlyReport = {
  periodKey: string;
  operational: {
    inspections: number;
    excavatorMovements: number;
    totalInformation: number;
    complaints: number;
    incidents: number;
    prospectiveManagers: number;
    notices: number;
    openInformation: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    byBlock: { blockCode: string; blockName: string; total: number; open: number }[];
  };
  financial: {
    openingBalance: number;
    income: number;
    expenses: number;
    paymentsReceived: number;
    duesObligation: number;
    receivables: number;
    outstandingReceivables: number;
    closingBalance: number;
    reconciliation: {
      paymentLedger: number;
      paymentCashIn: number;
      realizationLedger: number;
      realizationCashOut: number;
      reconciled: boolean;
    };
  };
  budget: {
    allocation: number;
    realization: number;
    remainingAllocation: number;
    absorptionPercentage: number;
    overAllocatedRealizations: number;
  };
};

function parsePeriod(periodKey: string, dateRange?: { dateFrom?: string; dateTo?: string }) {
  const validPeriod = monthlyReportPeriodSchema.parse({ periodKey }).periodKey;
  const [year, month] = validPeriod.split("-").map(Number);
  const monthlyStart = new Date(Date.UTC(year, month - 1, 1) - JAKARTA_OFFSET_MS);
  const monthlyEnd = new Date(Date.UTC(year, month, 1) - JAKARTA_OFFSET_MS);
  const start = dateRange?.dateFrom ? startOfJakartaDay(dateRange.dateFrom) : monthlyStart;
  const end = dateRange?.dateTo ? nextJakartaDay(dateRange.dateTo) : monthlyEnd;
  const endDateExclusive = dateRange?.dateTo ? nextCalendarDate(dateRange.dateTo) : `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-01`;
  return { periodKey: validPeriod, start, end, startDate: dateRange?.dateFrom ?? `${validPeriod}-01`, endDateExclusive };
}

function nextCalendarDate(value: string) { const date = new Date(`${value}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); }

function cashImpact(item: { transactionType: string; amount: number }): number {
  return item.transactionType === "CASH_IN" ? item.amount : -item.amount;
}

function increment(target: Record<string, number>, key: string): void {
  target[key] = (target[key] ?? 0) + 1;
}

export async function getMonthlyReportData(periodKey: string, dateRange?: { dateFrom?: string; dateTo?: string }): Promise<MonthlyReport> {
  await requirePermission(PERMISSIONS.REPORT_READ);
  const { periodKey: validPeriodKey, start, end, startDate, endDateExclusive } = parsePeriod(periodKey, dateRange);
  const database = getDb();
  const [periodRows, operationalRows, inspectionRows, movementRows, currentTransactions, priorTransactions, paymentRows, duesRows] = await Promise.all([
    database.select().from(budgetPeriod).where(eq(budgetPeriod.periodKey, validPeriodKey)).limit(1),
    database.select({ category: dailyInformation.category, priority: dailyInformation.priority, status: dailyInformation.status, blockCode: block.code, blockName: block.name }).from(dailyInformation).leftJoin(block, eq(block.id, dailyInformation.blockId)).where(and(gte(dailyInformation.reportedAt, start), lt(dailyInformation.reportedAt, end))),
    database.select({ id: inspection.id }).from(inspection).where(and(gte(inspection.inspectedAt, start), lt(inspection.inspectedAt, end))),
    database.select({ id: excavatorMovement.id }).from(excavatorMovement).where(and(gte(excavatorMovement.occurredAt, start), lt(excavatorMovement.occurredAt, end))),
    database.select({ transactionType: financialTransaction.transactionType, amount: financialTransaction.amount, status: financialTransaction.status, relatedEntityType: financialTransaction.relatedEntityType }).from(financialTransaction).where(and(inArray(financialTransaction.status, ["SAH", "REVERSED"]), gte(financialTransaction.transactionAt, start), lt(financialTransaction.transactionAt, end))),
    database.select({ transactionType: financialTransaction.transactionType, amount: financialTransaction.amount }).from(financialTransaction).where(and(inArray(financialTransaction.status, ["SAH", "REVERSED"]), lt(financialTransaction.transactionAt, start))),
    database
      .select({ amount: duePayment.amount })
      .from(duePayment)
      .innerJoin(financialTransaction, and(eq(financialTransaction.relatedEntityType, "DUE_PAYMENT"), eq(financialTransaction.relatedEntityId, duePayment.id), eq(financialTransaction.status, "SAH")))
      .where(and(gte(duePayment.paymentDate, startDate), lt(duePayment.paymentDate, endDateExclusive))),
    database.select({ amountDue: due.amountDue, amountPaid: due.amountPaid }).from(due).where(and(gte(due.dueDate, startDate), lt(due.dueDate, endDateExclusive))),
  ]);
  const period = periodRows[0] ?? null;
  const [budgetItems, realizations] = period ? await Promise.all([
    database.select({ allocatedAmount: budgetItem.allocatedAmount }).from(budgetItem).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(eq(budgetGroup.periodId, period.id)),
    database.select({ requestedAmount: realizationRequest.requestedAmount, isOverAllocation: realizationRequest.isOverAllocation }).from(realizationRequest).innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(and(eq(budgetGroup.periodId, period.id), eq(realizationRequest.status, "SAH"))),
  ]) : [[], []];

  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byBlock = new Map<string, { blockCode: string; blockName: string; total: number; open: number }>();
  for (const item of operationalRows) {
    increment(byStatus, item.status);
    increment(byCategory, item.category);
    increment(byPriority, item.priority);
    const isOpen = !["COMPLETED", "CLOSED"].includes(item.status);
    if (item.blockCode && item.blockName) {
      const summary = byBlock.get(item.blockCode) ?? { blockCode: item.blockCode, blockName: item.blockName, total: 0, open: 0 };
      summary.total += 1;
      summary.open += Number(isOpen);
      byBlock.set(item.blockCode, summary);
    }
  }

  const openingBalance = priorTransactions.reduce((total, item) => total + cashImpact(item), 0);
  const income = currentTransactions.filter((item) => item.transactionType === "CASH_IN").reduce((total, item) => total + item.amount, 0);
  const expenses = currentTransactions.filter((item) => item.transactionType === "CASH_OUT").reduce((total, item) => total + item.amount, 0);
  const paymentsReceived = paymentRows.reduce((total, item) => total + item.amount, 0);
  const duesObligation = duesRows.reduce((total, item) => total + item.amountDue, 0);
  const receivables = duesRows.reduce((total, item) => total + Math.max(0, item.amountDue - item.amountPaid), 0);
  const allocation = budgetItems.reduce((total, item) => total + item.allocatedAmount, 0);
  const realization = realizations.reduce((total, item) => total + item.requestedAmount, 0);
  const paymentCashIn = currentTransactions.filter((item) => item.status === "SAH" && item.transactionType === "CASH_IN" && item.relatedEntityType === "DUE_PAYMENT").reduce((total, item) => total + item.amount, 0);
  const realizationCashOut = currentTransactions.filter((item) => item.status === "SAH" && item.transactionType === "CASH_OUT" && item.relatedEntityType === "REALIZATION").reduce((total, item) => total + item.amount, 0);

  return {
    periodKey: validPeriodKey,
    operational: {
      inspections: inspectionRows.length,
      excavatorMovements: movementRows.length,
      totalInformation: operationalRows.length,
      complaints: byCategory.COMPLAINT ?? 0,
      incidents: byCategory.INCIDENT ?? 0,
      prospectiveManagers: byCategory.PROSPECTIVE_MANAGER ?? 0,
      notices: byCategory.NOTICE ?? 0,
      openInformation: Object.entries(byStatus).filter(([status]) => !["COMPLETED", "CLOSED"].includes(status)).reduce((total, [, value]) => total + value, 0),
      byStatus,
      byCategory,
      byPriority,
      byBlock: [...byBlock.values()].sort((left, right) => left.blockCode.localeCompare(right.blockCode)),
    },
    financial: {
      openingBalance,
      income,
      expenses,
      paymentsReceived,
      duesObligation,
      receivables,
      outstandingReceivables: receivables,
      closingBalance: openingBalance + income - expenses,
      reconciliation: { paymentLedger: paymentsReceived, paymentCashIn, realizationLedger: realization, realizationCashOut, reconciled: paymentsReceived === paymentCashIn && realization === realizationCashOut },
    },
    budget: {
      allocation,
      realization,
      remainingAllocation: allocation - realization,
      absorptionPercentage: allocation ? Math.round((realization / allocation) * 10_000) / 100 : 0,
      overAllocatedRealizations: realizations.filter((item) => item.isOverAllocation === 1).length,
    },
  };
}

export async function getMonthlyReport(periodKey: string, dateRange?: { dateFrom?: string; dateTo?: string }) {
  return getMonthlyReportData(periodKey, dateRange);
}
