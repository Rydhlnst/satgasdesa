import { and, eq, inArray, lt } from "drizzle-orm";

import { getDb } from "@/src/db";
import { budgetPeriod } from "@/src/db/schema/budgets";
import { dailyInformation } from "@/src/db/schema/daily-information";
import { due } from "@/src/db/schema/dues";
import { generateCurrentMonthlyDues } from "@/src/features/dues/automation";
import { notifyPermissionHolders } from "@/src/features/notifications/service";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

function jakartaDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = read("year"); const month = read("month"); const day = read("day");
  if (!year || !month || !day) throw new Error("Unable to determine the current Jakarta date.");
  return `${year}-${month}-${day}`;
}

function nextPeriodKey(now: Date): string {
  const [year, month] = jakartaDate(now).slice(0, 7).split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function notifyOverdueDues(today: string) {
  const overdue = await getDb().select({ id: due.id, payerName: due.payerName, amountDue: due.amountDue, amountPaid: due.amountPaid }).from(due).where(and(inArray(due.status, ["UNPAID", "PARTIAL"]), lt(due.dueDate, today))).orderBy(due.dueDate).limit(500);
  const results = await Promise.all(overdue.map((item) => notifyPermissionHolders({ permission: PERMISSIONS.DUES_MANAGE, ruleKey: "OVERDUE_DUE", targetKey: item.id, type: "OVERDUE_DUE", title: "Overdue excavator due", body: `${item.payerName} has an overdue balance of Rp${(item.amountDue - item.amountPaid).toLocaleString("id-ID")}.`, relatedEntityType: "DUE", relatedEntityId: item.id })));
  return { overdue: overdue.length, notificationsCreated: results.reduce((total, item) => total + item.created, 0) };
}

async function notifyUnresolvedDailyInformation() {
  const unresolved = await getDb().select({ id: dailyInformation.id, category: dailyInformation.category, priority: dailyInformation.priority }).from(dailyInformation).where(inArray(dailyInformation.status, ["NEW", "RECEIVED", "IN_PROGRESS"])).orderBy(dailyInformation.reportedAt).limit(500);
  const results = await Promise.all(unresolved.map((item) => notifyPermissionHolders({ permission: PERMISSIONS.DAILY_INFO_UPDATE, ruleKey: "UNRESOLVED_DAILY_INFORMATION", targetKey: item.id, type: "UNRESOLVED_DAILY_INFORMATION", title: "Daily information requires follow-up", body: `${item.priority} ${item.category.toLowerCase()} remains unresolved.`, relatedEntityType: "DAILY_INFORMATION", relatedEntityId: item.id })));
  return { unresolved: unresolved.length, notificationsCreated: results.reduce((total, item) => total + item.created, 0) };
}

async function notifyMissingNextMonthBudget(now: Date) {
  const periodKey = nextPeriodKey(now);
  const [existing] = await getDb().select({ id: budgetPeriod.id }).from(budgetPeriod).where(eq(budgetPeriod.periodKey, periodKey)).limit(1);
  if (existing) return { periodKey, missing: false, notificationsCreated: 0 };
  const result = await notifyPermissionHolders({ permission: PERMISSIONS.BUDGET_CREATE, ruleKey: "NEXT_MONTH_BUDGET_MISSING", targetKey: periodKey, type: "NEXT_MONTH_BUDGET_MISSING", title: "Next-month budget is not prepared", body: `Create the budget allocation for ${periodKey}.`, relatedEntityType: "BUDGET_PERIOD" });
  return { periodKey, missing: true, notificationsCreated: result.created };
}

export async function runDailyAutomations(actorUserId: string, now = new Date()) {
  const [monthlyDues, overdueDues, unresolvedInformation, missingBudget] = await Promise.all([
    generateCurrentMonthlyDues(actorUserId, now),
    notifyOverdueDues(jakartaDate(now)),
    notifyUnresolvedDailyInformation(),
    notifyMissingNextMonthBudget(now),
  ]);
  return { monthlyDues, overdueDues, unresolvedInformation, missingBudget };
}
