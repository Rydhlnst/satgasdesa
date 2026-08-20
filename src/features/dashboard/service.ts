import { and, count, eq, inArray, lt } from "drizzle-orm";

import { getDb } from "@/src/db";
import { block } from "@/src/db/schema/blocks";
import { budgetPeriod, realizationRequest } from "@/src/db/schema/budgets";
import { dailyInformation } from "@/src/db/schema/daily-information";
import { due } from "@/src/db/schema/dues";
import { excavator } from "@/src/db/schema/excavators";
import { inspection } from "@/src/db/schema/inspections";
import { getFinanceSummary } from "@/src/features/finance/service";
import { getReceivableReconciliation } from "@/src/features/dues/service";
import { getBudgetSummary } from "@/src/features/budgets/service";
import { getUserPermissions, requireAuth } from "@/src/lib/permissions/authorize";
import { PERMISSIONS, type Permission } from "@/src/lib/permissions/constants";

function jakartaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = read("year");
  const month = read("month");
  const day = read("day");
  if (!year || !month || !day) throw new Error("Unable to determine the Jakarta date.");
  return `${year}-${month}-${day}`;
}

function periodKeyForDate(date: string): string {
  return date.slice(0, 7);
}

function nextPeriodKey(periodKey: string): string {
  const [year, month] = periodKey.split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function has(permissions: Set<Permission>, permission: Permission): boolean {
  return permissions.has(permission);
}

async function getOperationalSummary() {
  const database = getDb();
  const [blockRows, excavatorRows, inspectionRows, informationRows] = await Promise.all([
    database.select({ status: block.status, total: count() }).from(block).groupBy(block.status),
    database.select({ status: excavator.status, total: count() }).from(excavator).groupBy(excavator.status),
    database.select({ total: count() }).from(inspection),
    database.select({ status: dailyInformation.status, total: count() }).from(dailyInformation).groupBy(dailyInformation.status),
  ]);
  const byStatus = (rows: { status: string; total: number }[]) => Object.fromEntries(rows.map((row) => [row.status, Number(row.total)]));
  const informationByStatus = byStatus(informationRows);
  return {
    blocks: { total: blockRows.reduce((sum, row) => sum + Number(row.total), 0), active: Number(blockRows.find((row) => row.status === "ACTIVE")?.total ?? 0), stopped: Number(blockRows.find((row) => row.status === "STOPPED")?.total ?? 0), notOperating: Number(blockRows.find((row) => row.status === "NOT_OPERATING")?.total ?? 0) },
    excavators: byStatus(excavatorRows),
    inspections: Number(inspectionRows[0]?.total ?? 0),
    dailyInformation: { byStatus: informationByStatus, open: Object.entries(informationByStatus).filter(([status]) => !["COMPLETED", "CLOSED"].includes(status)).reduce((sum, [, total]) => sum + total, 0) },
  };
}

export async function getDashboardSummary() {
  const session = await requireAuth();
  const permissions = new Set(await getUserPermissions(session.user.id));
  const operational = has(permissions, PERMISSIONS.BLOCK_READ) || has(permissions, PERMISSIONS.DAILY_INFO_READ) ? await getOperationalSummary() : null;
  const finance = has(permissions, PERMISSIONS.FINANCE_READ) ? await getFinanceSummary() : null;
  const dues = has(permissions, PERMISSIONS.DUES_READ) ? await getReceivableReconciliation() : null;
  const periodKey = periodKeyForDate(jakartaDate());
  const database = getDb();
  const [period] = has(permissions, PERMISSIONS.BUDGET_READ)
    ? await database.select().from(budgetPeriod).where(eq(budgetPeriod.periodKey, periodKey)).limit(1)
    : [];
  const budget = period ? await getBudgetSummary(period.id) : null;
  const realizationStatusRows = has(permissions, PERMISSIONS.REALIZATION_READ)
    ? await database.select({ status: realizationRequest.status, total: count() }).from(realizationRequest).groupBy(realizationRequest.status)
    : [];
  const realization = Object.fromEntries(realizationStatusRows.map((row) => [row.status, Number(row.total)]));
  return {
    roleScope: {
      canReadFinance: has(permissions, PERMISSIONS.FINANCE_READ),
      canReadDues: has(permissions, PERMISSIONS.DUES_READ),
      canReadBudget: has(permissions, PERMISSIONS.BUDGET_READ),
      canReadRealizations: has(permissions, PERMISSIONS.REALIZATION_READ),
      canReadOperations: Boolean(operational),
    },
    operational,
    finance,
    dues,
    budget: budget ? { periodKey, ...budget } : { periodKey, missing: true },
    realization,
  };
}

export type AttentionItem = {
  type: string;
  severity: "HIGH" | "MEDIUM";
  entityId: string;
  entityType: string;
  title: string;
  detail: string;
};

export async function getNeedsAttention(): Promise<AttentionItem[]> {
  const session = await requireAuth();
  const permissions = new Set(await getUserPermissions(session.user.id));
  const today = jakartaDate();
  const currentPeriodKey = periodKeyForDate(today);
  const database = getDb();
  const items: AttentionItem[] = [];
  if (has(permissions, PERMISSIONS.DUES_READ)) {
    const overdue = await database.select({ id: due.id, payerName: due.payerName, amountDue: due.amountDue, amountPaid: due.amountPaid }).from(due).where(and(inArray(due.status, ["UNPAID", "PARTIAL"]), lt(due.dueDate, today))).orderBy(due.dueDate).limit(50);
    items.push(...overdue.map<AttentionItem>((row) => ({ type: "OVERDUE_DUE", severity: "HIGH", entityId: row.id, entityType: "DUE", title: "Overdue excavator due", detail: `${row.payerName} has Rp${(row.amountDue - row.amountPaid).toLocaleString("id-ID")} outstanding.` })));
  }
  if (has(permissions, PERMISSIONS.DAILY_INFO_READ)) {
    const critical = await database.select({ id: dailyInformation.id, category: dailyInformation.category, priority: dailyInformation.priority }).from(dailyInformation).where(and(inArray(dailyInformation.priority, ["HIGH", "URGENT"]), inArray(dailyInformation.status, ["NEW", "RECEIVED", "IN_PROGRESS"]))).orderBy(dailyInformation.reportedAt).limit(50);
    items.push(...critical.map<AttentionItem>((row) => ({ type: "CRITICAL_INFORMATION", severity: "HIGH", entityId: row.id, entityType: "DAILY_INFORMATION", title: `${row.priority} daily information`, detail: `${row.category} requires follow-up.` })));
  }
  if (has(permissions, PERMISSIONS.REALIZATION_READ)) {
    const pending = await database.select({ id: realizationRequest.id, status: realizationRequest.status, requestedAmount: realizationRequest.requestedAmount, isOverAllocation: realizationRequest.isOverAllocation }).from(realizationRequest).where(inArray(realizationRequest.status, ["SUBMITTED", "VERIFIED"])).orderBy(realizationRequest.createdAt).limit(100);
    items.push(...pending.map<AttentionItem>((row) => ({ type: row.status === "SUBMITTED" ? "WAITING_VERIFICATION" : "WAITING_APPROVAL", severity: "MEDIUM", entityId: row.id, entityType: "REALIZATION", title: row.status === "SUBMITTED" ? "Realization waiting for verification" : "Realization waiting for approval", detail: `Requested amount Rp${row.requestedAmount.toLocaleString("id-ID")}.` })));
    items.push(...pending.filter((row) => row.isOverAllocation === 1).map<AttentionItem>((row) => ({ type: "OVER_ALLOCATION", severity: "HIGH", entityId: row.id, entityType: "REALIZATION", title: "Realization exceeds allocation", detail: "Special approval is required." })));
  }
  if (has(permissions, PERMISSIONS.BUDGET_READ)) {
    const nextKey = nextPeriodKey(currentPeriodKey);
    const [nextPeriod] = await database.select({ id: budgetPeriod.id }).from(budgetPeriod).where(eq(budgetPeriod.periodKey, nextKey)).limit(1);
    if (!nextPeriod) items.push({ type: "NEXT_MONTH_BUDGET_MISSING", severity: "MEDIUM", entityId: nextKey, entityType: "BUDGET_PERIOD", title: "Next-month budget is missing", detail: `Prepare the allocation for ${nextKey}.` });
  }
  if (has(permissions, PERMISSIONS.DAILY_INFO_READ)) {
    const unresolved = await database.select({ id: dailyInformation.id, category: dailyInformation.category, priority: dailyInformation.priority }).from(dailyInformation).where(inArray(dailyInformation.status, ["NEW", "RECEIVED", "IN_PROGRESS"])).orderBy(dailyInformation.reportedAt).limit(50);
    items.push(...unresolved.map<AttentionItem>((row) => ({ type: "UNRESOLVED_INFORMATION", severity: row.priority === "URGENT" ? "HIGH" : "MEDIUM", entityId: row.id, entityType: "DAILY_INFORMATION", title: "Daily information unresolved", detail: `${row.priority} ${row.category.toLowerCase()} still needs follow-up.` })));
  }
  return items;
}
