import { and, eq, lt } from "drizzle-orm";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { due } from "@/src/db/schema/dues";
import { excavator, excavatorMovement } from "@/src/db/schema/excavators";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

import { DUE_AMOUNTS_RUPIAH, getMonthlyDueDay } from "./config";

function periodBounds(periodKey: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodKey)) throw new Error("Period must use YYYY-MM.");
  const [year, month] = periodKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

function dueDateForPeriod(periodKey: string): string {
  const { end } = periodBounds(periodKey);
  const lastDay = new Date(end.getTime() - 24 * 60 * 60 * 1000).getUTCDate();
  const day = Math.min(getMonthlyDueDay(), lastDay);
  return `${periodKey}-${String(day).padStart(2, "0")}`;
}

function periodKeyInJakarta(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("Unable to determine the current accounting period.");
  return `${year}-${month}`;
}

async function activeExcavatorsForPeriod(periodKey: string) {
  const { end } = periodBounds(periodKey);
  const database = getDb();
  const [units, movements] = await Promise.all([
    database.select().from(excavator),
    database.select().from(excavatorMovement).where(lt(excavatorMovement.occurredAt, end)),
  ]);
  const movementsByUnit = new Map<string, typeof movements>();
  for (const movement of movements) {
    const unitMovements = movementsByUnit.get(movement.excavatorId) ?? [];
    unitMovements.push(movement);
    movementsByUnit.set(movement.excavatorId, unitMovements);
  }

  return units.filter((unit) => {
    const unitMovements = movementsByUnit.get(unit.id) ?? [];
    if (!unitMovements.length) return unit.status === "ACTIVE" && Boolean(unit.currentBlockId);
    let isActive = false;
    for (const movement of unitMovements.sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime())) {
      isActive = movement.movementType !== "EXIT";
    }
    return isActive;
  });
}

export async function generateMonthlyDuesForPeriod(periodKey: string, actorUserId: string) {
  periodBounds(periodKey);
  const eligibleUnits = await activeExcavatorsForPeriod(periodKey);
  if (!eligibleUnits.length) return { periodKey, created: 0, skipped: 0 };

  const database = getDb();
  const existing = await database
    .select({ excavatorId: due.excavatorId })
    .from(due)
    .where(and(eq(due.dueType, "MONTHLY"), eq(due.referenceKey, periodKey)));
  const existingIds = new Set(existing.map((item) => item.excavatorId));
  const pending = eligibleUnits.filter((unit) => !existingIds.has(unit.id));
  if (!pending.length) return { periodKey, created: 0, skipped: eligibleUnits.length };

  const now = new Date();
  await database.transaction(async (tx) => {
    const rows = pending.map((unit) => ({
      id: crypto.randomUUID(),
      excavatorId: unit.id,
      sourceMovementId: null,
      dueType: "MONTHLY",
      referenceKey: periodKey,
      payerName: unit.operatorName ?? unit.unitCode,
      amountDue: DUE_AMOUNTS_RUPIAH.MONTHLY,
      amountPaid: 0,
      status: "UNPAID",
      dueDate: dueDateForPeriod(periodKey),
      createdBy: actorUserId,
      createdAt: now,
      updatedAt: now,
    }));
    await tx.insert(due).values(rows);
    await tx.insert(auditLog).values(rows.map((row) => createAuditLogValues({ actorUserId, action: AUDIT_ACTIONS.CREATE, entityType: "DUE", entityId: row.id, newValues: { excavatorId: row.excavatorId, dueType: row.dueType, referenceKey: row.referenceKey, amountDue: row.amountDue, automated: true } })));
  });
  return { periodKey, created: pending.length, skipped: eligibleUnits.length - pending.length };
}

export async function generateCurrentMonthlyDues(actorUserId: string, now = new Date()) {
  return generateMonthlyDuesForPeriod(periodKeyInJakarta(now), actorUserId);
}

export async function generateMonthlyDues(input: { periodKey: string }) {
  const session = await requirePermission(PERMISSIONS.DUES_MANAGE);
  return generateMonthlyDuesForPeriod(input.periodKey, session.user.id);
}
