import { and, count, desc, eq, gte, inArray, isNull, lt, lte } from "drizzle-orm";

import { getDb } from "@/src/db";
import { block } from "@/src/db/schema/blocks";
import { budgetGroup, budgetItem, budgetPeriod, realizationRequest } from "@/src/db/schema/budgets";
import { dailyInformation } from "@/src/db/schema/daily-information";
import { due } from "@/src/db/schema/dues";
import { excavator } from "@/src/db/schema/excavators";
import { fieldTask, fieldWorker, workerBlockAssignment } from "@/src/db/schema/field-work";
import { financialTransaction } from "@/src/db/schema/finance";
import { fundRequest } from "@/src/db/schema/fund-requests";
import { inspection } from "@/src/db/schema/inspections";
import { getBudgetSummary } from "@/src/features/budgets/service";
import { getReceivableReconciliation } from "@/src/features/dues/service";
import { getAssignedBlockIdsForCurrentUser } from "@/src/features/field-operations/service";
import { getMonthlyReportData } from "@/src/features/reports/service";
import { getUserPermissions, requireAuth } from "@/src/lib/permissions/authorize";
import { PERMISSIONS, type Permission } from "@/src/lib/permissions/constants";
import { nextJakartaDay, startOfJakartaDay } from "@/src/lib/date-range";

const FINAL_INFORMATION_STATUSES = ["COMPLETED", "CLOSED"];
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export type AttentionItem = { type: string; severity: "HIGH" | "MEDIUM"; entityId: string; entityType: string; title: string; detail: string; href?: string };

function jakartaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = read("year"); const month = read("month"); const day = read("day");
  if (!year || !month || !day) throw new Error("Unable to determine the Jakarta date.");
  return `${year}-${month}-${day}`;
}

function periodKeyForDate(date: string): string { return date.slice(0, 7); }
function validPeriodKey(value?: string): string { return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : periodKeyForDate(jakartaDate()); }
function periodRange(periodKey: string) { const [year, month] = periodKey.split("-").map(Number); return { start: new Date(Date.UTC(year, month - 1, 1) - JAKARTA_OFFSET_MS), end: new Date(Date.UTC(year, month, 1) - JAKARTA_OFFSET_MS) }; }
function selectedRange(periodKey: string, dateFrom?: string, dateTo?: string) { return dateFrom || dateTo ? { start: dateFrom ? startOfJakartaDay(dateFrom) : new Date("1970-01-01T00:00:00.000Z"), end: dateTo ? nextJakartaDay(dateTo) : new Date("2999-12-31T00:00:00.000Z") } : periodRange(periodKey); }
function nextPeriodKey(periodKey: string): string { const [year, month] = periodKey.split("-").map(Number); const next = new Date(Date.UTC(year, month, 1)); return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`; }
function has(permissions: Set<Permission>, permission: Permission): boolean { return permissions.has(permission); }
function statusCounts(rows: { status: string; total: number }[]): Record<string, number> { return Object.fromEntries(rows.map((row) => [row.status, Number(row.total)])); }
function openInformationCount(rows: Record<string, number>): number { return Object.entries(rows).filter(([status]) => !FINAL_INFORMATION_STATUSES.includes(status)).reduce((total, [, value]) => total + value, 0); }

async function getOperationalSummary(input: { periodKey: string; dateFrom?: string; dateTo?: string; assignedBlockIds: string[] | null; userId: string; tasksMineOnly: boolean }) {
  const database = getDb(); const { start, end } = selectedRange(input.periodKey, input.dateFrom, input.dateTo);
  if (input.assignedBlockIds && !input.assignedBlockIds.length) return { blocks: { total: 0, active: 0, stopped: 0, notOperating: 0 }, excavators: {}, inspections: 0, dailyInformation: { byStatus: {}, open: 0 }, workers: 0, tasks: { TODO: 0, IN_PROGRESS: 0, DONE: 0, CANCELLED: 0, dueToday: 0, items: [] as Array<{ id: string; title: string; status: string; priority: string; dueDate: string | null }> } };
  const blockConditions = [isNull(block.archivedAt), input.assignedBlockIds ? inArray(block.id, input.assignedBlockIds) : undefined].filter(Boolean);
  const inspectionWhere = and(gte(inspection.inspectedAt, start), lt(inspection.inspectedAt, end), ...(input.assignedBlockIds ? [inArray(inspection.blockId, input.assignedBlockIds)] : []));
  const informationWhere = and(gte(dailyInformation.reportedAt, start), lt(dailyInformation.reportedAt, end), ...(input.assignedBlockIds ? [inArray(dailyInformation.blockId, input.assignedBlockIds)] : []));
  const taskConditions = [input.tasksMineOnly ? eq(fieldTask.assignedFieldOfficerId, input.userId) : undefined, input.assignedBlockIds ? inArray(fieldTask.blockId, input.assignedBlockIds) : undefined, input.dateFrom ? gte(fieldTask.dueDate, input.dateFrom) : undefined, input.dateTo ? lte(fieldTask.dueDate, input.dateTo) : undefined].filter(Boolean);
  const workerJoinConditions = [eq(workerBlockAssignment.workerId, fieldWorker.id), isNull(workerBlockAssignment.endedAt), input.assignedBlockIds ? inArray(workerBlockAssignment.blockId, input.assignedBlockIds) : undefined].filter(Boolean);
  const [blockRows, excavatorRows, inspectionRows, informationRows, workerRows, taskRows, taskItems] = await Promise.all([
    database.select({ status: block.status, total: count() }).from(block).where(blockConditions.length ? and(...blockConditions) : undefined).groupBy(block.status),
    database.select({ status: excavator.status, total: count() }).from(excavator).where(input.assignedBlockIds ? inArray(excavator.currentBlockId, input.assignedBlockIds) : undefined).groupBy(excavator.status),
    database.select({ total: count() }).from(inspection).where(inspectionWhere),
    database.select({ status: dailyInformation.status, total: count() }).from(dailyInformation).where(informationWhere).groupBy(dailyInformation.status),
    database.select({ total: count() }).from(fieldWorker).leftJoin(workerBlockAssignment, and(...workerJoinConditions)).where(and(eq(fieldWorker.status, "ACTIVE"), input.assignedBlockIds ? inArray(workerBlockAssignment.blockId, input.assignedBlockIds) : undefined)),
    database.select({ status: fieldTask.status, total: count() }).from(fieldTask).where(taskConditions.length ? and(...taskConditions) : undefined).groupBy(fieldTask.status),
    database.select({ id: fieldTask.id, title: fieldTask.title, status: fieldTask.status, priority: fieldTask.priority, dueDate: fieldTask.dueDate }).from(fieldTask).where(and(...taskConditions, inArray(fieldTask.status, ["TODO", "IN_PROGRESS"]))).orderBy(desc(fieldTask.priority), fieldTask.dueDate).limit(5),
  ]);
  const blockByStatus = statusCounts(blockRows); const informationByStatus = statusCounts(informationRows); const tasks = statusCounts(taskRows); const today = jakartaDate();
  return {
    blocks: { total: Object.values(blockByStatus).reduce((total, value) => total + value, 0), active: blockByStatus.ACTIVE ?? 0, stopped: blockByStatus.STOPPED ?? 0, notOperating: blockByStatus.NOT_OPERATING ?? 0 },
    excavators: statusCounts(excavatorRows), inspections: Number(inspectionRows[0]?.total ?? 0), dailyInformation: { byStatus: informationByStatus, open: openInformationCount(informationByStatus) }, workers: Number(workerRows[0]?.total ?? 0),
    tasks: { TODO: tasks.TODO ?? 0, IN_PROGRESS: tasks.IN_PROGRESS ?? 0, DONE: tasks.DONE ?? 0, CANCELLED: tasks.CANCELLED ?? 0, dueToday: taskItems.filter((item) => item.dueDate === today).length, items: taskItems },
  };
}

async function getPeriodFinance(periodKey: string, dateFrom?: string, dateTo?: string) {
  const { start, end } = selectedRange(periodKey, dateFrom, dateTo);
  const rows = await getDb().select({ transactionType: financialTransaction.transactionType, amount: financialTransaction.amount, transactionAt: financialTransaction.transactionAt }).from(financialTransaction).where(and(eq(financialTransaction.status, "SAH"), lt(financialTransaction.transactionAt, end)));
  const incomeExpenseSeries = Array.from({ length: 4 }, (_, index) => ({ label: `Minggu ${index + 1}`, income: 0, expense: 0 })); let openingBalance = 0; let cashIn = 0; let cashOut = 0;
  for (const row of rows) {
    const signed = row.transactionType === "CASH_IN" ? row.amount : -row.amount;
    if (row.transactionAt < start) { openingBalance += signed; continue; }
    if (row.transactionType === "CASH_IN") cashIn += row.amount; else cashOut += row.amount;
    const week = Math.min(3, Math.max(0, Math.floor((row.transactionAt.getUTCDate() - 1) / 7)));
    if (row.transactionType === "CASH_IN") incomeExpenseSeries[week].income += row.amount; else incomeExpenseSeries[week].expense += row.amount;
  }
  return { openingBalance, cashIn, cashOut, cashBalance: openingBalance + cashIn - cashOut, transactionCount: rows.filter((row) => row.transactionAt >= start).length, incomeExpenseSeries };
}

type DashboardCategory = { id: string; name: string; allocatedAmount: number; realizedAmount: number; remainingAmount: number; absorptionPercentage: number };

async function getBudgetDashboard(periodKey: string, canReadBudget: boolean, canReadRealizations: boolean) {
  if (!canReadBudget) return { periodKey, missing: true as const, categories: [] as DashboardCategory[] };
  const [period] = await getDb().select().from(budgetPeriod).where(eq(budgetPeriod.periodKey, periodKey)).limit(1);
  if (!period) return { periodKey, missing: true as const, categories: [] as DashboardCategory[] };
  const [summary, rows] = await Promise.all([
    getBudgetSummary(period.id),
    getDb().select({ groupId: budgetGroup.id, groupName: budgetGroup.name, allocatedAmount: budgetItem.allocatedAmount, requestedAmount: realizationRequest.requestedAmount, realizationStatus: realizationRequest.status }).from(budgetGroup).leftJoin(budgetItem, eq(budgetItem.groupId, budgetGroup.id)).leftJoin(realizationRequest, eq(realizationRequest.budgetItemId, budgetItem.id)).where(eq(budgetGroup.periodId, period.id)),
  ]);
  const categories = new Map<string, Omit<DashboardCategory, "remainingAmount" | "absorptionPercentage">>();
  for (const row of rows) {
    const category = categories.get(row.groupId) ?? { id: row.groupId, name: row.groupName, allocatedAmount: 0, realizedAmount: 0 };
    category.allocatedAmount += row.allocatedAmount ?? 0;
    if (canReadRealizations && row.realizationStatus === "SAH") category.realizedAmount += row.requestedAmount ?? 0;
    categories.set(row.groupId, category);
  }
  return { periodKey, status: period.status, ...summary, categories: [...categories.values()].map((category) => ({ ...category, remainingAmount: category.allocatedAmount - category.realizedAmount, absorptionPercentage: category.allocatedAmount ? Math.round((category.realizedAmount / category.allocatedAmount) * 10_000) / 100 : 0 })) };
}

export async function getDashboardSummary(input?: { periodKey?: string; dateFrom?: string; dateTo?: string }) {
  const session = await requireAuth(); const permissions = new Set(await getUserPermissions(session.user.id)); const periodKey = validPeriodKey(input?.periodKey ?? input?.dateFrom?.slice(0, 7)); const assignedBlockIds = await getAssignedBlockIdsForCurrentUser();
  const canReadOperations = has(permissions, PERMISSIONS.BLOCK_READ) || has(permissions, PERMISSIONS.DAILY_INFO_READ); const canReadBudget = has(permissions, PERMISSIONS.BUDGET_READ); const canReadRealizations = has(permissions, PERMISSIONS.REALIZATION_READ);
  const [operational, finance, dues, budget, report] = await Promise.all([
    canReadOperations ? getOperationalSummary({ periodKey, dateFrom: input?.dateFrom, dateTo: input?.dateTo, assignedBlockIds, userId: session.user.id, tasksMineOnly: !has(permissions, PERMISSIONS.FIELD_ASSIGNMENT_MANAGE) }) : null,
    has(permissions, PERMISSIONS.FINANCE_READ) ? getPeriodFinance(periodKey, input?.dateFrom, input?.dateTo) : null,
    has(permissions, PERMISSIONS.DUES_READ) ? getReceivableReconciliation({ periodKey, dateFrom: input?.dateFrom, dateTo: input?.dateTo }) : null,
    getBudgetDashboard(periodKey, canReadBudget, canReadRealizations),
    has(permissions, PERMISSIONS.REPORT_READ) ? getMonthlyReportData(periodKey, { dateFrom: input?.dateFrom, dateTo: input?.dateTo }) : null,
  ]);
  const database = getDb(); const [period] = canReadRealizations || has(permissions, PERMISSIONS.FUND_REQUEST_READ) ? await database.select({ id: budgetPeriod.id }).from(budgetPeriod).where(eq(budgetPeriod.periodKey, periodKey)).limit(1) : [];
  const [realizationRows, requestRows] = await Promise.all([
    canReadRealizations && period ? database.select({ status: realizationRequest.status, total: count() }).from(realizationRequest).innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(eq(budgetGroup.periodId, period.id)).groupBy(realizationRequest.status) : Promise.resolve([]),
    has(permissions, PERMISSIONS.FUND_REQUEST_READ) && period ? database.select({ status: fundRequest.status, total: count() }).from(fundRequest).where(eq(fundRequest.budgetPeriodId, period.id)).groupBy(fundRequest.status) : Promise.resolve([]),
  ]);
  return {
    roleScope: { canManageUsers: has(permissions, PERMISSIONS.USER_READ), canReadFinance: has(permissions, PERMISSIONS.FINANCE_READ), canReadDues: has(permissions, PERMISSIONS.DUES_READ), canReadBudget, canReadRealizations, canReadOperations },
    periodKey, operational, finance, dues, report, budget, realization: statusCounts(realizationRows), requests: statusCounts(requestRows),
    charts: { dues: dues ? { receivedAmount: dues.recordedPaidTotal, outstandingAmount: dues.receivableTotal, paidPercentage: dues.obligationTotal ? Math.round((dues.recordedPaidTotal / dues.obligationTotal) * 100) : 0 } : null, finance: finance ? { incomeExpenseSeries: finance.incomeExpenseSeries } : null, budget: { categories: budget.categories } },
  };
}

export async function getNeedsAttention(input?: { periodKey?: string }): Promise<AttentionItem[]> {
  const session = await requireAuth(); const permissions = new Set(await getUserPermissions(session.user.id)); const today = jakartaDate(); const periodKey = validPeriodKey(input?.periodKey); const database = getDb(); const assignedBlockIds = await getAssignedBlockIdsForCurrentUser(); const items: AttentionItem[] = [];
  if (has(permissions, PERMISSIONS.DUES_READ)) {
    const overdue = await database.select({ id: due.id, payerName: due.payerName, amountDue: due.amountDue, amountPaid: due.amountPaid }).from(due).where(and(inArray(due.status, ["UNPAID", "PARTIAL"]), lt(due.dueDate, today), ...(assignedBlockIds ? [inArray(due.blockId, assignedBlockIds)] : []))).orderBy(due.dueDate).limit(20);
    items.push(...overdue.map((row) => ({ type: "OVERDUE_DUE", severity: "HIGH" as const, entityId: row.id, entityType: "DUE", title: "Iuran melewati jatuh tempo", detail: `${row.payerName}: sisa Rp${(row.amountDue - row.amountPaid).toLocaleString("id-ID")}.`, href: `/due/${row.id}` })));
  }
  if (has(permissions, PERMISSIONS.DAILY_INFO_READ)) {
    const critical = await database.select({ id: dailyInformation.id, category: dailyInformation.category }).from(dailyInformation).where(and(inArray(dailyInformation.priority, ["HIGH", "URGENT"]), inArray(dailyInformation.status, ["NEW", "RECEIVED", "IN_PROGRESS"]), ...(assignedBlockIds ? [inArray(dailyInformation.blockId, assignedBlockIds)] : []))).orderBy(dailyInformation.reportedAt).limit(20);
    items.push(...critical.map((row) => ({ type: "CRITICAL_INFORMATION", severity: "HIGH" as const, entityId: row.id, entityType: "DAILY_INFORMATION", title: "Informasi harian prioritas tinggi", detail: `${row.category} perlu ditindaklanjuti.`, href: `/information/${row.id}` })));
  }
  if (has(permissions, PERMISSIONS.FIELD_TASK_READ)) {
    const mineOnly = !has(permissions, PERMISSIONS.FIELD_ASSIGNMENT_MANAGE);
    const tasks = await database.select({ id: fieldTask.id, title: fieldTask.title, priority: fieldTask.priority, dueDate: fieldTask.dueDate }).from(fieldTask).where(and(inArray(fieldTask.status, ["TODO", "IN_PROGRESS"]), mineOnly ? eq(fieldTask.assignedFieldOfficerId, session.user.id) : undefined, assignedBlockIds ? inArray(fieldTask.blockId, assignedBlockIds) : undefined)).orderBy(fieldTask.dueDate).limit(20);
    items.push(...tasks.filter((task) => task.dueDate && task.dueDate <= today).map((task) => ({ type: "DUE_FIELD_TASK", severity: task.priority === "HIGH" || task.priority === "URGENT" ? "HIGH" as const : "MEDIUM" as const, entityId: task.id, entityType: "FIELD_TASK", title: "Tugas lapangan perlu dikerjakan", detail: task.title, href: `/task/${task.id}` })));
  }
  if (has(permissions, PERMISSIONS.REALIZATION_READ)) {
    const pending = await database.select({ id: realizationRequest.id, status: realizationRequest.status, requestedAmount: realizationRequest.requestedAmount, isOverAllocation: realizationRequest.isOverAllocation }).from(realizationRequest).innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).innerJoin(budgetPeriod, eq(budgetPeriod.id, budgetGroup.periodId)).where(and(eq(budgetPeriod.periodKey, periodKey), inArray(realizationRequest.status, ["SUBMITTED", "VERIFIED"]))).orderBy(realizationRequest.createdAt).limit(20);
    items.push(...pending.map((row) => ({ type: row.status === "SUBMITTED" ? "WAITING_VERIFICATION" : "WAITING_APPROVAL", severity: "MEDIUM" as const, entityId: row.id, entityType: "REALIZATION", title: row.status === "SUBMITTED" ? "Realisasi menunggu verifikasi" : "Realisasi menunggu persetujuan", detail: `Nilai Rp${row.requestedAmount.toLocaleString("id-ID")}.`, href: `/realization/${row.id}` })));
    items.push(...pending.filter((row) => row.isOverAllocation === 1).map((row) => ({ type: "OVER_ALLOCATION", severity: "HIGH" as const, entityId: row.id, entityType: "REALIZATION", title: "Realisasi melebihi alokasi", detail: "Perlu penyesuaian atau persetujuan khusus.", href: `/realization/${row.id}` })));
  }
  if (has(permissions, PERMISSIONS.FUND_REQUEST_READ)) {
    const [period] = await database.select({ id: budgetPeriod.id }).from(budgetPeriod).where(eq(budgetPeriod.periodKey, periodKey)).limit(1);
    if (period) {
      const pendingRequests = await database.select({ id: fundRequest.id, status: fundRequest.status, title: fundRequest.title }).from(fundRequest).where(and(eq(fundRequest.budgetPeriodId, period.id), inArray(fundRequest.status, ["SUBMITTED", "VERIFIED"]))).orderBy(fundRequest.createdAt).limit(20);
      items.push(...pendingRequests.map((row) => ({ type: "FUND_REQUEST_PENDING", severity: "MEDIUM" as const, entityId: row.id, entityType: "FUND_REQUEST", title: row.status === "SUBMITTED" ? "Pengajuan dana menunggu verifikasi" : "Pengajuan dana menunggu persetujuan", detail: row.title, href: `/fund-request/${row.id}` })));
    }
  }
  if (has(permissions, PERMISSIONS.BUDGET_READ)) {
    const nextKey = nextPeriodKey(periodKey); const [nextPeriod] = await database.select({ id: budgetPeriod.id }).from(budgetPeriod).where(eq(budgetPeriod.periodKey, nextKey)).limit(1);
    if (!nextPeriod) items.push({ type: "NEXT_MONTH_BUDGET_MISSING", severity: "MEDIUM", entityId: nextKey, entityType: "BUDGET_PERIOD", title: "Alokasi bulan berikutnya belum dibuat", detail: `Siapkan periode ${nextKey}.`, href: "/budgets" });
  }
  return items.slice(0, 50);
}
