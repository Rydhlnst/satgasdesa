import { and, asc, count, desc, eq, gte, inArray, lt } from "drizzle-orm";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { due, duePayment } from "@/src/db/schema/dues";
import { excavator, excavatorMovement } from "@/src/db/schema/excavators";
import { financialTransaction } from "@/src/db/schema/finance";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { createDueSchema, dueIdSchema, duesFiltersSchema, recordDuePaymentSchema } from "./schema";

function parseInput<T>(result: { success: boolean; data?: T }): T {
  if (!result.success || !result.data) throw new Error("Please check the dues details and try again.");
  return result.data;
}

function optionalValue(value?: string): string | null {
  return value?.trim() ? value.trim() : null;
}

function createPaymentTransactionCode(): string {
  return `TX-PAY-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
}

function periodBounds(periodKey: string): { start: string; end: string } {
  const [year, month] = periodKey.split("-").map(Number);
  const end = new Date(Date.UTC(year, month, 1));
  return { start: `${periodKey}-01`, end: end.toISOString().slice(0, 10) };
}

function buildDueConditions(filters: ReturnType<typeof duesFiltersSchema.parse>) {
  const conditions = [];
  if (filters.status) conditions.push(eq(due.status, filters.status));
  if (filters.dueType) conditions.push(eq(due.dueType, filters.dueType));
  if (filters.blockId) conditions.push(eq(excavator.currentBlockId, filters.blockId));
  if (filters.periodKey) {
    const bounds = periodBounds(filters.periodKey);
    conditions.push(gte(due.dueDate, bounds.start), lt(due.dueDate, bounds.end));
  }
  return conditions.length ? and(...conditions) : undefined;
}

async function assertExcavatorExists(id: string): Promise<void> {
  const [item] = await getDb().select({ id: excavator.id }).from(excavator).where(eq(excavator.id, id)).limit(1);
  if (!item) throw new Error("Excavator was not found.");
}

async function assertDueSource(values: { dueType: "MONTHLY" | "ROAD_ENTRY"; sourceMovementId?: string; excavatorId: string; referenceKey: string }) {
  if (values.dueType !== "ROAD_ENTRY" || !values.sourceMovementId) return;
  const [movement] = await getDb()
    .select({ id: excavatorMovement.id, movementType: excavatorMovement.movementType, excavatorId: excavatorMovement.excavatorId })
    .from(excavatorMovement)
    .where(eq(excavatorMovement.id, values.sourceMovementId))
    .limit(1);
  if (!movement || movement.excavatorId !== values.excavatorId || movement.movementType !== "ENTRY" || values.referenceKey !== `ENTRY-${movement.id}`) {
    throw new Error("Road-entry due must reference the matching excavator entry movement.");
  }
}

export async function getDues(status?: "UNPAID" | "PARTIAL" | "PAID") {
  await requirePermission(PERMISSIONS.DUES_READ);
  const database = getDb();
  const query = database.select().from(due);
  return status
    ? query.where(eq(due.status, status)).orderBy(desc(due.dueDate)).limit(100)
    : query.orderBy(desc(due.dueDate)).limit(100);
}

export async function getDuesPage(input?: unknown) {
  await requirePermission(PERMISSIONS.DUES_READ);
  const filters = duesFiltersSchema.parse(input ?? {});
  const conditions = buildDueConditions(filters);
  const offset = (filters.page - 1) * filters.pageSize;
  const database = getDb();
  const [rows, totalRows] = await Promise.all([
    database.select().from(due).innerJoin(excavator, eq(excavator.id, due.excavatorId)).where(conditions).orderBy(desc(due.dueDate), asc(due.id)).limit(filters.pageSize).offset(offset),
    database.select({ value: count() }).from(due).innerJoin(excavator, eq(excavator.id, due.excavatorId)).where(conditions),
  ]);
  const total = Number(totalRows[0]?.value ?? 0);
  return { rows, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function getReceivableReconciliation(input?: unknown) {
  await requirePermission(PERMISSIONS.DUES_READ);
  const filters = duesFiltersSchema.parse(input ?? {});
  const conditions = buildDueConditions(filters);
  const database = getDb();
  const dueRows = await database
    .select({ id: due.id, amountDue: due.amountDue, amountPaid: due.amountPaid, status: due.status })
    .from(due)
    .innerJoin(excavator, eq(excavator.id, due.excavatorId))
    .where(conditions);
  const dueIds = dueRows.map((row) => row.id);
  const paymentRows = dueIds.length
    ? await database.select({ dueId: duePayment.dueId, amount: duePayment.amount }).from(duePayment).where(inArray(duePayment.dueId, dueIds))
    : [];
  const obligationTotal = dueRows.reduce((total, row) => total + row.amountDue, 0);
  const recordedPaidTotal = dueRows.reduce((total, row) => total + row.amountPaid, 0);
  const paymentLedgerTotal = paymentRows.reduce((total, row) => total + row.amount, 0);
  const receivableTotal = obligationTotal - recordedPaidTotal;
  return {
    obligationTotal,
    recordedPaidTotal,
    paymentLedgerTotal,
    receivableTotal,
    reconciled: recordedPaidTotal === paymentLedgerTotal && receivableTotal >= 0,
    counts: {
      total: dueRows.length,
      unpaid: dueRows.filter((row) => row.status === "UNPAID").length,
      partial: dueRows.filter((row) => row.status === "PARTIAL").length,
      paid: dueRows.filter((row) => row.status === "PAID").length,
    },
  };
}

export async function getDue(id: string) {
  await requirePermission(PERMISSIONS.DUES_READ);
  const validId = parseInput(dueIdSchema.safeParse(id));
  const [item] = await getDb().select().from(due).where(eq(due.id, validId)).limit(1);
  if (!item) return null;
  const payments = await getDb().select().from(duePayment).where(eq(duePayment.dueId, validId)).orderBy(desc(duePayment.paymentDate));
  return { item: { ...item, remaining: item.amountDue - item.amountPaid }, payments };
}

export async function createDue(input: unknown) {
  const session = await requirePermission(PERMISSIONS.DUES_MANAGE);
  const values = parseInput(createDueSchema.safeParse(input));
  await assertExcavatorExists(values.excavatorId);
  await assertDueSource(values);
  const database = getDb();
  const [existing] = await database
    .select({ id: due.id })
    .from(due)
    .where(
      and(
        eq(due.excavatorId, values.excavatorId),
        eq(due.dueType, values.dueType),
        eq(due.referenceKey, values.referenceKey),
      ),
    )
    .limit(1);
  if (existing) throw new Error("A due already exists for this excavator and reference period.");

  const id = crypto.randomUUID();
  const now = new Date();
  await database.transaction(async (tx) => {
    await tx.insert(due).values({
      id,
      excavatorId: values.excavatorId,
      sourceMovementId: values.sourceMovementId ?? null,
      dueType: values.dueType,
      referenceKey: values.referenceKey,
      payerName: values.payerName,
      amountDue: values.amountDue,
      amountPaid: 0,
      status: "UNPAID",
      dueDate: values.dueDate,
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.CREATE,
        entityType: "DUE",
        entityId: id,
        newValues: { excavatorId: values.excavatorId, dueType: values.dueType, referenceKey: values.referenceKey, amountDue: values.amountDue },
      }),
    );
  });
  return { id };
}

export async function recordDuePayment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.PAYMENT_CREATE);
  const values = parseInput(recordDuePaymentSchema.safeParse(input));
  const database = getDb();
  const paymentId = values.idempotencyKey;
  const result = await database.transaction(async (tx) => {
    const [existingPayment] = await tx.select().from(duePayment).where(eq(duePayment.id, paymentId)).limit(1);
    if (existingPayment) {
      if (existingPayment.dueId !== values.dueId || existingPayment.amount !== values.amount || existingPayment.paymentDate !== values.paymentDate || existingPayment.method !== values.method) {
        throw new Error("This payment idempotency key was already used for different payment data.");
      }
      const [cashTransaction] = await tx
        .select({ id: financialTransaction.id })
        .from(financialTransaction)
        .where(and(eq(financialTransaction.relatedEntityType, "DUE_PAYMENT"), eq(financialTransaction.relatedEntityId, paymentId)))
        .limit(1);
      const [existingDue] = await tx.select({ amountPaid: due.amountPaid, status: due.status }).from(due).where(eq(due.id, values.dueId)).limit(1);
      if (!existingDue || !cashTransaction) throw new Error("Existing payment records are incomplete and require reconciliation.");
      return { id: paymentId, cashTransactionId: cashTransaction.id, dueId: values.dueId, amountPaid: existingDue.amountPaid, status: existingDue.status, duplicate: true };
    }

    const [current] = await tx.select().from(due).where(eq(due.id, values.dueId)).limit(1);
    if (!current) throw new Error("Due was not found.");
    if (current.status === "PAID") throw new Error("This due has already been fully paid.");

    const remaining = current.amountDue - current.amountPaid;
    if (values.amount > remaining) throw new Error("Payment exceeds the outstanding balance.");
    const amountPaid = current.amountPaid + values.amount;
    const status = amountPaid === current.amountDue ? "PAID" : "PARTIAL";
    const cashTransactionId = crypto.randomUUID();
    const now = new Date();
    const [updateResult] = await tx
      .update(due)
      .set({ amountPaid, status, updatedAt: now })
      .where(and(eq(due.id, current.id), eq(due.amountPaid, current.amountPaid), eq(due.status, current.status)));
    if (updateResult.affectedRows !== 1) throw new Error("This due was changed by another payment. Retry with a new idempotency key.");

    await tx.insert(duePayment).values({
      id: paymentId,
      dueId: current.id,
      payerName: values.payerName,
      paymentDate: values.paymentDate,
      amount: values.amount,
      method: values.method,
      evidenceKey: optionalValue(values.evidenceKey),
      notes: optionalValue(values.notes),
      recordedBy: session.user.id,
      createdAt: now,
    });
    await tx.insert(financialTransaction).values({
      id: cashTransactionId,
      transactionCode: createPaymentTransactionCode(),
      transactionAt: new Date(`${values.paymentDate}T00:00:00.000Z`),
      transactionType: "CASH_IN",
      amount: values.amount,
      description: `Due payment for ${current.id}`,
      relatedEntityType: "DUE_PAYMENT",
      relatedEntityId: paymentId,
      evidenceKey: optionalValue(values.evidenceKey),
      status: "SAH",
      createdBy: session.user.id,
      approvedBy: session.user.id,
      reversedTransactionId: null,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(auditLog).values([
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.CREATE,
        entityType: "DUE_PAYMENT",
        entityId: paymentId,
        oldValues: { amountPaid: current.amountPaid, status: current.status },
        newValues: { dueId: current.id, amount: values.amount, amountPaid, status },
      }),
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: "DUE",
        entityId: current.id,
        oldValues: { amountPaid: current.amountPaid, status: current.status },
        newValues: { amountPaid, status },
      }),
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.CREATE,
        entityType: "FINANCIAL_TRANSACTION",
        entityId: cashTransactionId,
        newValues: { relatedEntityType: "DUE_PAYMENT", relatedEntityId: paymentId, amount: values.amount, transactionType: "CASH_IN" },
      }),
    ]);

    return { id: paymentId, cashTransactionId, dueId: current.id, amountPaid, status, duplicate: false };
  });
  return result;
}
