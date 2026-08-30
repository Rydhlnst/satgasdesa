import { and, asc, count, desc, eq, gte, inArray, like, lt, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { block } from "@/src/db/schema/blocks";
import { businessActor, duePaymentVerification } from "@/src/db/schema/business-actors";
import { due, duePayment } from "@/src/db/schema/dues";
import { excavator, excavatorMovement } from "@/src/db/schema/excavators";
import { financialTransaction } from "@/src/db/schema/finance";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getObjectStorage, validateUpload } from "@/src/lib/storage";
import { getAssignedBlockIdsForCurrentUser, requireAssignedBlockAccess } from "@/src/features/field-operations/service";
import { applyDuePayment, hasMatchingPaymentIdentity, reverseDuePayment as reverseDuePaymentState } from "./payment-rules";
import { confirmDuePaymentSchema, createDueSchema, dueIdSchema, duePaymentEvidenceDownloadSchema, duePaymentFiltersSchema, duePaymentUploadSchema, duesFiltersSchema, recordDuePaymentSchema, rejectDuePaymentSchema, reverseDuePaymentSchema } from "./schema";
import { assertMonthlyPaymentDate } from "./config";
import { getFinanceDefaults } from "../settings/service";
import { reverseFinancialTransactionRecord } from "@/src/features/finance/service";
import { parseValidatedInput } from "@/src/lib/validation";

function parseInput<T>(result: { success: boolean; data?: T; error?: unknown }): T {
  return parseValidatedInput(result, "Periksa data iuran lalu coba lagi.");
}

function optionalValue(value?: string): string | null {
  return value?.trim() ? value.trim() : null;
}

function createPaymentTransactionCode(): string {
  return `TX-PAY-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
}

function duePaymentScope(paymentId: string): string { return `due-payments/${paymentId}`; }
function assertDuePaymentEvidenceKey(paymentId: string, storageKey: string): void {
  const scope = `${duePaymentScope(paymentId)}/`;
  if (!storageKey.startsWith(scope) || storageKey.slice(scope.length).includes("/") || storageKey.includes("..") || storageKey.includes("\\")) throw new Error("Bukti pembayaran berada di luar penyimpanan yang diizinkan.");
}

function buildDueConditions(filters: ReturnType<typeof duesFiltersSchema.parse>) {
  const conditions = [];
  if (filters.status) conditions.push(eq(due.status, filters.status));
  if (filters.dueType) conditions.push(eq(due.dueType, filters.dueType));
  if (filters.blockId) conditions.push(eq(due.blockId, filters.blockId));
  if (filters.periodKey) conditions.push(eq(due.referenceKey, filters.periodKey));
  if (filters.dateFrom) conditions.push(gte(due.dueDate, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(due.dueDate, filters.dateTo));
  if (filters.query) conditions.push(or(like(due.payerName, `%${filters.query}%`), like(due.referenceKey, `%${filters.query}%`)));
  if (filters.overdueOnly) conditions.push(and(inArray(due.status, ["UNPAID", "PARTIAL"]), lt(due.dueDate, jakartaDate())));
  return conditions.length ? and(...conditions) : undefined;
}

function jakartaDate(today = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(today);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = value("year"); const month = value("month"); const day = value("day");
  if (!year || !month || !day) throw new Error("Tanggal Jakarta tidak dapat ditentukan.");
  return `${year}-${month}-${day}`;
}

async function assertExcavatorExists(id: string): Promise<void> {
  const [item] = await getDb().select({ id: excavator.id }).from(excavator).where(eq(excavator.id, id)).limit(1);
  if (!item) throw new Error("Alat berat tidak ditemukan.");
}

async function assertDueSource(values: { dueType: "MONTHLY" | "ROAD_ENTRY"; sourceMovementId?: string; excavatorId: string; referenceKey: string }) {
  if (values.dueType !== "ROAD_ENTRY" || !values.sourceMovementId) return;
  const [movement] = await getDb()
    .select({ id: excavatorMovement.id, movementType: excavatorMovement.movementType, excavatorId: excavatorMovement.excavatorId })
    .from(excavatorMovement)
    .where(eq(excavatorMovement.id, values.sourceMovementId))
    .limit(1);
  if (!movement || movement.excavatorId !== values.excavatorId || movement.movementType !== "ENTRY" || values.referenceKey !== `ENTRY-${movement.id}`) {
    throw new Error("Iuran masuk jalan harus mengacu pada pergerakan masuk alat berat yang sesuai.");
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
  const assignedBlockIds = await getAssignedBlockIdsForCurrentUser();
  if (assignedBlockIds && !assignedBlockIds.length) return { rows: [], pagination: { page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 0 } };
  const baseConditions = buildDueConditions(filters);
  const conditions = assignedBlockIds ? and(baseConditions, inArray(due.blockId, assignedBlockIds)) : baseConditions;
  const offset = (filters.page - 1) * filters.pageSize;
  const database = getDb();
  const [rows, totalRows] = await Promise.all([
    database.select().from(due).innerJoin(excavator, eq(excavator.id, due.excavatorId)).leftJoin(block, eq(block.id, due.blockId)).leftJoin(businessActor, eq(businessActor.id, due.businessActorId)).where(conditions).orderBy(desc(due.dueDate), asc(due.id)).limit(filters.pageSize).offset(offset),
    database.select({ value: count() }).from(due).innerJoin(excavator, eq(excavator.id, due.excavatorId)).where(conditions),
  ]);
  const total = Number(totalRows[0]?.value ?? 0);
  return { rows, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function getReceivableReconciliation(input?: unknown) {
  await requirePermission(PERMISSIONS.DUES_READ);
  const filters = duesFiltersSchema.parse(input ?? {});
  const assignedBlockIds = await getAssignedBlockIdsForCurrentUser();
  if (assignedBlockIds && !assignedBlockIds.length) return { obligationTotal: 0, recordedPaidTotal: 0, paymentLedgerTotal: 0, receivableTotal: 0, reconciled: true, counts: { total: 0, unpaid: 0, partial: 0, paid: 0 } };
  const baseConditions = buildDueConditions(filters);
  const conditions = assignedBlockIds ? and(baseConditions, inArray(due.blockId, assignedBlockIds)) : baseConditions;
  const database = getDb();
  const dueRows = await database
    .select({ id: due.id, amountDue: due.amountDue, amountPaid: due.amountPaid, status: due.status })
    .from(due)
    .innerJoin(excavator, eq(excavator.id, due.excavatorId))
    .where(conditions);
  const dueIds = dueRows.map((row) => row.id);
  const paymentRows = dueIds.length
    ? await database
      .select({ dueId: duePayment.dueId, amount: duePayment.amount })
      .from(duePayment)
      .innerJoin(financialTransaction, and(eq(financialTransaction.relatedEntityType, "DUE_PAYMENT"), eq(financialTransaction.relatedEntityId, duePayment.id), eq(financialTransaction.status, "SAH")))
      .where(inArray(duePayment.dueId, dueIds))
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
  if (item.blockId) await requireAssignedBlockAccess(item.blockId);
  const [paymentRows, verifications] = await Promise.all([
    getDb().select({ payment: duePayment, cashStatus: financialTransaction.status, cashTransactionId: financialTransaction.id }).from(duePayment).leftJoin(financialTransaction, and(eq(financialTransaction.relatedEntityType, "DUE_PAYMENT"), eq(financialTransaction.relatedEntityId, duePayment.id))).where(eq(duePayment.dueId, validId)).orderBy(desc(duePayment.paymentDate)),
    getDb().select().from(duePaymentVerification).innerJoin(duePayment, eq(duePayment.id, duePaymentVerification.duePaymentId)).where(eq(duePayment.dueId, validId)).orderBy(desc(duePaymentVerification.verifiedAt)),
  ]);
  return { item: { ...item, remaining: item.amountDue - item.amountPaid, paymentState: duePaymentState(item) }, payments: paymentRows.map((row) => ({ ...row.payment, cashStatus: row.cashStatus ?? "MISSING", cashTransactionId: row.cashTransactionId })), verifications };
}

export async function getDuePaymentsPage(input?: unknown) {
  await requirePermission(PERMISSIONS.DUES_READ);
  const filters = duePaymentFiltersSchema.parse(input ?? {});
  const assignedBlockIds = await getAssignedBlockIdsForCurrentUser();
  if (assignedBlockIds && !assignedBlockIds.length) return { rows: [], pagination: { page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 0 } };
  const monthStart = filters.periodKey ? `${filters.periodKey}-01` : filters.dateFrom;
  const [year, month] = filters.periodKey?.split("-").map(Number) ?? [];
  const nextMonthStart = filters.dateTo ? nextDate(filters.dateTo) : monthStart && year && month ? `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01` : undefined;
  const conditions = [
    filters.blockId ? eq(due.blockId, filters.blockId) : undefined,
    assignedBlockIds ? inArray(due.blockId, assignedBlockIds) : undefined,
    filters.query ? or(like(duePayment.payerName, `%${filters.query}%`), like(due.payerName, `%${filters.query}%`), like(due.referenceKey, `%${filters.query}%`)) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const database = getDb(); const offset = (filters.page - 1) * filters.pageSize;
  const dateConditions = [
    ...conditions,
    monthStart ? sqlDateGte(duePayment.paymentDate, monthStart) : undefined,
    nextMonthStart ? sqlDateLt(duePayment.paymentDate, nextMonthStart) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const where = dateConditions.length ? and(...dateConditions) : undefined;
  const [rows, totals] = await Promise.all([
    database.select({ payment: duePayment, due: { id: due.id, blockId: due.blockId, payerName: due.payerName, referenceKey: due.referenceKey, dueType: due.dueType }, block: { code: block.code, name: block.name }, cashStatus: financialTransaction.status }).from(duePayment).innerJoin(due, eq(due.id, duePayment.dueId)).leftJoin(block, eq(block.id, due.blockId)).leftJoin(financialTransaction, and(eq(financialTransaction.relatedEntityType, "DUE_PAYMENT"), eq(financialTransaction.relatedEntityId, duePayment.id))).where(where).orderBy(desc(duePayment.paymentDate), desc(duePayment.createdAt)).limit(filters.pageSize).offset(offset),
    database.select({ value: count() }).from(duePayment).innerJoin(due, eq(due.id, duePayment.dueId)).where(where),
  ]);
  const total = Number(totals[0]?.value ?? 0);
  return { rows, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

function sqlDateGte(column: typeof duePayment.paymentDate, value: string) { return sql`${column} >= ${value}`; }
function sqlDateLt(column: typeof duePayment.paymentDate, value: string) { return sql`${column} < ${value}`; }
function nextDate(value: string): string { const date = new Date(`${value}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); }

function duePaymentState(item: { amountDue: number; amountPaid: number; dueDate: string }, today = new Date()): "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE" {
  if (item.amountPaid >= item.amountDue) return "PAID";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(today);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = value("year"); const month = value("month"); const day = value("day");
  if (!year || !month || !day) throw new Error("Tanggal Jakarta tidak dapat ditentukan.");
  const jakarta = `${year}-${month}-${day}`;
  if (item.dueDate < jakarta) return "OVERDUE";
  return item.amountPaid > 0 ? "PARTIAL" : "UNPAID";
}

export async function createDue(input: unknown) {
  const session = await requirePermission(PERMISSIONS.DUES_MANAGE);
  const values = parseInput(createDueSchema.safeParse(input));
  const defaults = await getFinanceDefaults();
  const expectedAmount = values.dueType === "MONTHLY" ? defaults.monthlyDueAmount : defaults.roadEntryDueAmount;
  if (values.amountDue !== expectedAmount) throw new Error(`The configured ${values.dueType === "MONTHLY" ? "monthly" : "road-entry"} due is Rp${expectedAmount.toLocaleString("id-ID")}.`);
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
  if (existing) throw new Error("Iuran untuk alat berat dan periode referensi ini sudah ada.");

  const id = crypto.randomUUID();
  const now = new Date();
  const [unit] = await database.select({ currentBlockId: excavator.currentBlockId, businessActorId: excavator.businessActorId }).from(excavator).where(eq(excavator.id, values.excavatorId)).limit(1);
  if (!unit?.currentBlockId) throw new Error("Alat berat harus ditugaskan ke blok sebelum iuran dapat dibuat.");
  await database.transaction(async (tx) => {
    await tx.insert(due).values({
      id,
      excavatorId: values.excavatorId,
      blockId: unit.currentBlockId,
      businessActorId: unit.businessActorId,
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

export async function createDuePaymentUploadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.PAYMENT_CREATE);
  const values = parseInput(duePaymentUploadSchema.safeParse(input));
  const [item] = await getDb().select({ id: due.id, blockId: due.blockId }).from(due).where(eq(due.id, values.dueId)).limit(1);
  if (!item) throw new Error("Iuran tidak ditemukan.");
  if (item.blockId) await requireAssignedBlockAccess(item.blockId);
  validateUpload(values);
  const upload = await getObjectStorage().createUploadUrl({ ...values, scope: duePaymentScope(values.paymentId) });
  assertDuePaymentEvidenceKey(values.paymentId, upload.key);
  return { key: upload.key, uploadUrl: upload.uploadUrl };
}

export async function getDuePaymentEvidenceDownloadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.DUES_READ);
  const values = parseInput(duePaymentEvidenceDownloadSchema.safeParse(input));
  const [payment] = await getDb().select({ evidenceKey: duePayment.evidenceKey, blockId: due.blockId }).from(duePayment).innerJoin(due, eq(due.id, duePayment.dueId)).where(eq(duePayment.id, values.duePaymentId)).limit(1);
  if (!payment?.evidenceKey) throw new Error("Bukti pembayaran tidak ditemukan.");
  if (payment.blockId) await requireAssignedBlockAccess(payment.blockId);
  assertDuePaymentEvidenceKey(values.duePaymentId, payment.evidenceKey);
  return { downloadUrl: await getObjectStorage().createDownloadUrl(payment.evidenceKey) };
}

export async function getBlockReceivableSummary(input?: unknown) {
  await requirePermission(PERMISSIONS.DUES_READ);
  const filters = duesFiltersSchema.parse(input ?? {});
  const assignedBlockIds = await getAssignedBlockIdsForCurrentUser();
  if (assignedBlockIds && !assignedBlockIds.length) return [];
  const baseConditions = buildDueConditions({ ...filters, dueType: filters.dueType ?? "MONTHLY" });
  const conditions = assignedBlockIds ? and(baseConditions, inArray(due.blockId, assignedBlockIds)) : baseConditions;
  const rows = await getDb().select({ blockId: due.blockId, blockCode: block.code, blockName: block.name, amountDue: due.amountDue, amountPaid: due.amountPaid, dueDate: due.dueDate }).from(due).leftJoin(block, eq(block.id, due.blockId)).where(conditions);
  const grouped = new Map<string, { blockId: string | null; blockCode: string | null; blockName: string | null; obligationTotal: number; paidTotal: number; arrearsTotal: number; overdueUnits: number; units: number }>();
  for (const row of rows) {
    const key = row.blockId ?? "UNASSIGNED";
    const current = grouped.get(key) ?? { blockId: row.blockId, blockCode: row.blockCode, blockName: row.blockName, obligationTotal: 0, paidTotal: 0, arrearsTotal: 0, overdueUnits: 0, units: 0 };
    current.obligationTotal += row.amountDue; current.paidTotal += row.amountPaid; current.arrearsTotal += row.amountDue - row.amountPaid; current.units += 1;
    if (duePaymentState(row) === "OVERDUE") current.overdueUnits += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((left, right) => right.arrearsTotal - left.arrearsTotal || (left.blockCode ?? "").localeCompare(right.blockCode ?? ""));
}

export async function recordDuePayment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.PAYMENT_CREATE);
  const values = parseInput(recordDuePaymentSchema.safeParse(input));
  if (!values.evidenceKey) throw new Error("Bukti pembayaran wajib dilampirkan.");
  if (values.evidenceKey) assertDuePaymentEvidenceKey(values.idempotencyKey, values.evidenceKey);
  if (values.evidenceKey) await getObjectStorage().verifyObject(values.evidenceKey);
  const database = getDb();
  const paymentId = values.idempotencyKey;
  const result = await database.transaction(async (tx) => {
    const [existingPayment] = await tx.select().from(duePayment).where(eq(duePayment.id, paymentId)).limit(1);
    if (existingPayment) {
      if (!hasMatchingPaymentIdentity(existingPayment, values)) {
        throw new Error("Kunci idempotensi pembayaran ini sudah digunakan untuk data pembayaran yang berbeda.");
      }
      return { id: paymentId, dueId: existingPayment.dueId, status: existingPayment.status, duplicate: true };
    }

    const [current] = await tx.select().from(due).where(eq(due.id, values.dueId)).limit(1);
    if (!current) throw new Error("Iuran tidak ditemukan.");
    if (current.dueType === "MONTHLY") assertMonthlyPaymentDate(values.paymentDate);
    const pendingRows = await tx.select({ amount: duePayment.amount }).from(duePayment).where(and(eq(duePayment.dueId, current.id), eq(duePayment.status, "PENDING")));
    const pendingAmount = pendingRows.reduce((total, row) => total + row.amount, 0);
    if (current.amountPaid + pendingAmount + values.amount > current.amountDue) throw new Error("Total pembayaran yang sudah dikonfirmasi dan masih menunggu tidak boleh melebihi jumlah tagihan.");
    const now = new Date();

    await tx.insert(duePayment).values({
      id: paymentId,
      dueId: current.id,
      payerName: values.payerName,
      paymentDate: values.paymentDate,
      amount: values.amount,
      method: values.method,
      evidenceKey: optionalValue(values.evidenceKey),
      notes: optionalValue(values.notes),
      status: "PENDING",
      confirmedBy: null,
      confirmedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      financialTransactionId: null,
      recordedBy: session.user.id,
      createdAt: now,
    });
    await tx.insert(auditLog).values([
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.CREATE,
        entityType: "DUE_PAYMENT",
        entityId: paymentId,
        newValues: { dueId: current.id, amount: values.amount, status: "PENDING" },
      }),
    ]);

    return { id: paymentId, dueId: current.id, status: "PENDING", duplicate: false };
  });
  return result;
}

export async function confirmDuePayment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.PAYMENT_CONFIRM);
  const values = parseInput(confirmDuePaymentSchema.safeParse(input));
  return getDb().transaction(async (tx) => {
    const [payment] = await tx.select().from(duePayment).where(eq(duePayment.id, values.duePaymentId)).limit(1);
    if (!payment) throw new Error("Pembayaran iuran tidak ditemukan.");
    if (payment.status === "CONFIRMED") return { id: payment.id, status: payment.status, duplicate: true };
    if (payment.status !== "PENDING") throw new Error("Hanya pembayaran yang masih menunggu yang dapat dikonfirmasi.");
    const [currentDue] = await tx.select().from(due).where(eq(due.id, payment.dueId)).limit(1);
    if (!currentDue) throw new Error("Iuran tidak ditemukan.");
    const { amountPaid, status } = applyDuePayment(currentDue, payment.amount);
    const now = new Date(); const transactionId = crypto.randomUUID();
    const [updated] = await tx.update(due).set({ amountPaid, status, updatedAt: now }).where(and(eq(due.id, currentDue.id), eq(due.amountPaid, currentDue.amountPaid), eq(due.status, currentDue.status)));
    if (updated.affectedRows !== 1) throw new Error("Data iuran berubah sebelum konfirmasi. Muat ulang lalu coba lagi.");
    await tx.insert(financialTransaction).values({ id: transactionId, transactionCode: createPaymentTransactionCode(), transactionAt: new Date(`${payment.paymentDate}T00:00:00.000Z`), transactionType: "CASH_IN", amount: payment.amount, description: `Pembayaran iuran ${currentDue.id}`, relatedEntityType: "DUE_PAYMENT", relatedEntityId: payment.id, evidenceKey: payment.evidenceKey, status: "SAH", createdBy: payment.recordedBy, approvedBy: session.user.id, reversedTransactionId: null, createdAt: now, updatedAt: now });
    await tx.update(duePayment).set({ status: "CONFIRMED", confirmedBy: session.user.id, confirmedAt: now, financialTransactionId: transactionId }).where(and(eq(duePayment.id, payment.id), eq(duePayment.status, "PENDING")));
    await tx.insert(auditLog).values([createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.APPROVE, entityType: "DUE_PAYMENT", entityId: payment.id, oldValues: { status: "PENDING" }, newValues: { status: "CONFIRMED", transactionId } }), createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "DUE", entityId: currentDue.id, oldValues: { amountPaid: currentDue.amountPaid, status: currentDue.status }, newValues: { amountPaid, status } })]);
    return { id: payment.id, dueId: currentDue.id, status: "CONFIRMED", amountPaid, dueStatus: status, duplicate: false };
  });
}

export async function rejectDuePayment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.PAYMENT_CONFIRM);
  const values = parseInput(rejectDuePaymentSchema.safeParse(input)); const now = new Date();
  const [result] = await getDb().update(duePayment).set({ status: "REJECTED", rejectedBy: session.user.id, rejectedAt: now, rejectionReason: values.reason }).where(and(eq(duePayment.id, values.duePaymentId), eq(duePayment.status, "PENDING")));
  if (result.affectedRows !== 1) throw new Error("Hanya pembayaran yang masih menunggu yang dapat ditolak.");
  await getDb().insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.REJECT, entityType: "DUE_PAYMENT", entityId: values.duePaymentId, oldValues: { status: "PENDING" }, newValues: { status: "REJECTED", reason: values.reason } }));
  return { id: values.duePaymentId, status: "REJECTED" };
}

export async function reverseDuePayment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.PAYMENT_CREATE);
  const canManageDues = await hasPermission(session.user.id, PERMISSIONS.DUES_MANAGE);
  const values = parseInput(reverseDuePaymentSchema.safeParse(input));
  const database = getDb();
  return database.transaction(async (tx) => {
    const [payment] = await tx.select().from(duePayment).where(eq(duePayment.id, values.duePaymentId)).limit(1);
    if (!payment) throw new Error("Pembayaran iuran tidak ditemukan.");
    const [currentDue] = await tx.select().from(due).where(eq(due.id, payment.dueId)).limit(1);
    if (!currentDue) throw new Error("Iuran tidak ditemukan.");
    if (currentDue.blockId) await requireAssignedBlockAccess(currentDue.blockId);
    if (payment.status === "CANCELLED") return { id: payment.id, dueId: currentDue.id, status: payment.status, duplicate: true };
    if (payment.status === "PENDING") {
      if (!canManageDues && payment.recordedBy !== session.user.id) {
        const error = new Error("Pembayaran yang masih menunggu hanya dapat dibatalkan oleh pencatat atau pengelola iuran.");
        Object.assign(error, { code: "FORBIDDEN", status: 403 });
        throw error;
      }
      const [cancelResult] = await tx.update(duePayment).set({ status: "CANCELLED", rejectionReason: values.reason }).where(and(eq(duePayment.id, payment.id), eq(duePayment.status, "PENDING")));
      if (cancelResult.affectedRows !== 1) throw new Error("Status pembayaran berubah sebelum pembatalan diterapkan. Muat ulang lalu coba lagi.");
      await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "DUE_PAYMENT", entityId: payment.id, oldValues: { status: "PENDING" }, newValues: { status: "CANCELLED", reason: values.reason, idempotencyKey: values.idempotencyKey } }));
      return { id: payment.id, dueId: currentDue.id, status: "CANCELLED", cancelled: true, duplicate: false };
    }
    if (payment.status !== "CONFIRMED") throw new Error("Pembayaran hanya dapat dibatalkan jika masih menunggu atau sudah dikonfirmasi.");
    if (!canManageDues) {
      const error = new Error("Anda tidak memiliki izin untuk membatalkan pembayaran yang sudah dikonfirmasi.");
      Object.assign(error, { code: "FORBIDDEN", status: 403 });
      throw error;
    }
    const [cashTransaction] = await tx.select().from(financialTransaction).where(and(eq(financialTransaction.relatedEntityType, "DUE_PAYMENT"), eq(financialTransaction.relatedEntityId, payment.id))).limit(1);
    if (!cashTransaction) throw new Error("Transaksi kas pembayaran tidak ditemukan.");
    if (cashTransaction.status === "REVERSED") return { id: payment.id, dueId: currentDue.id, status: currentDue.status, duplicate: true };
    if (cashTransaction.status !== "SAH") throw new Error("Hanya transaksi pembayaran yang sudah disahkan yang dapat dibatalkan.");
    const { amountPaid, status } = reverseDuePaymentState(currentDue, payment.amount);
    const now = new Date();
    const [updateResult] = await tx.update(due).set({ amountPaid, status, updatedAt: now }).where(and(eq(due.id, currentDue.id), eq(due.amountPaid, currentDue.amountPaid), eq(due.status, currentDue.status)));
    if (updateResult.affectedRows !== 1) throw new Error("Data iuran berubah sebelum pembatalan diterapkan. Muat ulang lalu coba lagi.");
    const reversalId = await reverseFinancialTransactionRecord(tx, cashTransaction, session.user.id, values.reason);
    await tx.update(duePayment).set({ status: "REVERSED" }).where(eq(duePayment.id, payment.id));
    await tx.insert(auditLog).values([
      createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.REVERSE, entityType: "DUE_PAYMENT", entityId: payment.id, oldValues: { amount: payment.amount }, newValues: { dueId: currentDue.id, amountPaid, status, reason: values.reason, reversalId, idempotencyKey: values.idempotencyKey } }),
      createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "DUE", entityId: currentDue.id, oldValues: { amountPaid: currentDue.amountPaid, status: currentDue.status }, newValues: { amountPaid, status, reversedPaymentId: payment.id } }),
    ]);
    return { id: payment.id, dueId: currentDue.id, status, reversalId, duplicate: false };
  });
}
