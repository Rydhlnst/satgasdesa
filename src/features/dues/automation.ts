import { and, eq, lt } from "drizzle-orm";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { businessActor } from "@/src/db/schema/business-actors";
import { due } from "@/src/db/schema/dues";
import { excavator, excavatorMovement } from "@/src/db/schema/excavators";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";


function periodBounds(periodKey: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodKey)) throw new Error("Periode harus menggunakan format YYYY-MM.");
  const [year, month] = periodKey.split("-").map(Number);
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

function isoDate(value: Date): string { return value.toISOString().slice(0, 10); }

function dueDateForPeriod(periodKey: string, firstActiveDate: string, dueDay: number): string {
  const { end } = periodBounds(periodKey);
  const day = Math.min(dueDay, new Date(end.getTime() - 24 * 60 * 60 * 1000).getUTCDate());
  const currentDueDate = `${periodKey}-${String(day).padStart(2, "0")}`;
  if (firstActiveDate <= currentDueDate) return currentDueDate;
  const [year, month] = periodKey.split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  const nextLastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, nextLastDay)).padStart(2, "0")}`;
}

function periodKeyInJakarta(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("Unable to determine the current accounting period.");
  return `${year}-${month}`;
}

type EligibleUnit = { id: string; blockId: string; businessActorId: string | null; payerName: string; firstActiveDate: string };

async function activeExcavatorsForPeriod(periodKey: string): Promise<EligibleUnit[]> {
  const { start, end } = periodBounds(periodKey);
  const [units, movements] = await Promise.all([
    getDb().select({ id: excavator.id, unitCode: excavator.unitCode, operatorName: excavator.operatorName, currentBlockId: excavator.currentBlockId, currentEntryDate: excavator.currentEntryDate, status: excavator.status, businessActorId: excavator.businessActorId, businessActorName: businessActor.name }).from(excavator).leftJoin(businessActor, eq(businessActor.id, excavator.businessActorId)),
    getDb().select().from(excavatorMovement).where(lt(excavatorMovement.occurredAt, end)),
  ]);
  const movementsByUnit = new Map<string, typeof movements>();
  for (const movement of movements) movementsByUnit.set(movement.excavatorId, [...(movementsByUnit.get(movement.excavatorId) ?? []), movement]);

  const startDate = isoDate(start);
  const endDate = isoDate(new Date(end.getTime() - 24 * 60 * 60 * 1000));
  return units.flatMap((unit) => {
    const history = (movementsByUnit.get(unit.id) ?? []).sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
    if (!history.length) {
      if (unit.status !== "ACTIVE" || !unit.currentBlockId || !unit.currentEntryDate || unit.currentEntryDate > endDate) return [];
      return [{ id: unit.id, blockId: unit.currentBlockId, businessActorId: unit.businessActorId, payerName: unit.businessActorName ?? unit.operatorName ?? unit.unitCode, firstActiveDate: unit.currentEntryDate < startDate ? startDate : unit.currentEntryDate }];
    }
    let activeBlockId: string | null = null;
    let billingBlockId: string | null = null;
    let firstActiveDate: string | null = null;
    for (const movement of history) {
      const occurredDate = isoDate(movement.occurredAt);
      if (occurredDate < startDate) { activeBlockId = movement.movementType === "EXIT" ? null : movement.toBlockId; continue; }
      if (activeBlockId && !firstActiveDate) { firstActiveDate = startDate; billingBlockId = activeBlockId; }
      if (movement.movementType === "EXIT") { activeBlockId = null; continue; }
      if (!firstActiveDate) firstActiveDate = occurredDate;
      if (!billingBlockId) billingBlockId = movement.toBlockId;
      activeBlockId = movement.toBlockId;
    }
    if (activeBlockId && !firstActiveDate) { firstActiveDate = startDate; billingBlockId = activeBlockId; }
    if (!billingBlockId || !firstActiveDate) return [];
    return [{ id: unit.id, blockId: billingBlockId, businessActorId: unit.businessActorId, payerName: unit.businessActorName ?? unit.operatorName ?? unit.unitCode, firstActiveDate }];
  });
}

export async function generateMonthlyDuesForPeriod(periodKey: string, actorUserId: string) {
  periodBounds(periodKey);
  const { getFinanceDefaults } = await import("../settings/service");
  const defaults = await getFinanceDefaults();
  const eligibleUnits = await activeExcavatorsForPeriod(periodKey);
  if (!eligibleUnits.length) return { periodKey, created: 0, skipped: 0 };
  const database = getDb();
  const existing = await database.select({ excavatorId: due.excavatorId }).from(due).where(and(eq(due.dueType, "MONTHLY"), eq(due.referenceKey, periodKey)));
  const existingIds = new Set(existing.map((item) => item.excavatorId));
  const pending = eligibleUnits.filter((unit) => !existingIds.has(unit.id));
  if (!pending.length) return { periodKey, created: 0, skipped: eligibleUnits.length };

  const now = new Date();
  await database.transaction(async (tx) => {
    const rows = pending.map((unit) => ({ id: crypto.randomUUID(), excavatorId: unit.id, blockId: unit.blockId, businessActorId: unit.businessActorId, sourceMovementId: null, dueType: "MONTHLY", referenceKey: periodKey, payerName: unit.payerName, amountDue: defaults.monthlyDueAmount, amountPaid: 0, status: "UNPAID", dueDate: dueDateForPeriod(periodKey, unit.firstActiveDate, defaults.monthlyDueDay), createdBy: actorUserId, createdAt: now, updatedAt: now }));
    await tx.insert(due).values(rows);
    await tx.insert(auditLog).values(rows.map((row) => createAuditLogValues({ actorUserId, action: AUDIT_ACTIONS.CREATE, entityType: "DUE", entityId: row.id, newValues: { excavatorId: row.excavatorId, blockId: row.blockId, dueType: row.dueType, referenceKey: row.referenceKey, amountDue: row.amountDue, automated: true } })));
  });
  return { periodKey, created: pending.length, skipped: eligibleUnits.length - pending.length };
}

export async function generateCurrentMonthlyDues(actorUserId: string, now = new Date()) { return generateMonthlyDuesForPeriod(periodKeyInJakarta(now), actorUserId); }

export async function generateMonthlyDues(input: { periodKey: string }) {
  const session = await requirePermission(PERMISSIONS.DUES_MANAGE);
  return generateMonthlyDuesForPeriod(input.periodKey, session.user.id);
}
