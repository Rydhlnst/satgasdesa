import { and, count, desc, eq, gte, inArray, like, lt, or, sum } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { duePayment } from "@/src/db/schema/dues";
import { financeCategory, financialTransaction } from "@/src/db/schema/finance";
import { realizationRequest } from "@/src/db/schema/budgets";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getObjectStorage, validateUpload } from "@/src/lib/storage";
import { nextJakartaDay, startOfJakartaDay } from "@/src/lib/date-range";

import { approveFinancialTransactionSchema, createFinancialTransactionSchema, financeCategoryFiltersSchema, financeCategorySchema, financialTransactionEvidenceDownloadSchema, financialTransactionFiltersSchema, financialTransactionUploadSchema, reverseFinancialTransactionSchema, updateFinanceCategorySchema } from "./schema";

function parseInput<T>(result: { success: boolean; data?: T }): T {
  if (!result.success || !result.data) throw new Error("Please check the financial transaction details and try again.");
  return result.data;
}

function optionalValue(value?: string): string | null {
  return value?.trim() ? value.trim() : null;
}

function numericTotal(value: string | number | null | undefined): number {
  return value == null ? 0 : Number(value);
}

function createTransactionCode(): string {
  return `TX-${crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`;
}

function idempotentTransactionCode(idempotencyKey: string): string {
  return `TX-${idempotencyKey.replaceAll("-", "").toUpperCase()}`;
}

function financialTransactionScope(transactionId: string): string { return `financial-transactions/${transactionId}`; }
function assertFinancialEvidenceKey(transactionId: string, storageKey: string): void {
  const scope = `${financialTransactionScope(transactionId)}/`;
  if (!storageKey.startsWith(scope) || storageKey.slice(scope.length).includes("/") || storageKey.includes("..") || storageKey.includes("\\")) throw new Error("Transaction evidence is outside the permitted storage scope.");
}

function sameTransactionPayload(current: typeof financialTransaction.$inferSelect, values: z.infer<typeof createFinancialTransactionSchema>): boolean {
  return current.transactionType === values.transactionType
    && current.amount === values.amount
    && current.description === values.description
    && current.categoryId === (values.categoryId ?? null)
    && current.relatedEntityType === optionalValue(values.relatedEntityType)
    && current.relatedEntityId === (values.relatedEntityId ?? null)
    && current.evidenceKey === optionalValue(values.evidenceKey);
}

async function assertActiveFinanceCategory(categoryId: string | undefined, transactionType: "CASH_IN" | "CASH_OUT"): Promise<void> {
  if (!categoryId) return;
  const [category] = await getDb().select({ transactionType: financeCategory.transactionType, isActive: financeCategory.isActive }).from(financeCategory).where(eq(financeCategory.id, categoryId)).limit(1);
  if (!category || !category.isActive || category.transactionType !== transactionType) throw new Error("Select an active category matching the transaction type.");
}

export async function getFinanceCategories(input?: unknown) {
  await requirePermission(PERMISSIONS.FINANCE_READ);
  const values = financeCategoryFiltersSchema.parse(input ?? {});
  const conditions = [
    values.transactionType ? eq(financeCategory.transactionType, values.transactionType) : undefined,
    values.includeInactive ? undefined : eq(financeCategory.isActive, true),
    values.query ? like(financeCategory.name, `%${values.query}%`) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  return getDb().select().from(financeCategory).where(conditions.length ? and(...conditions) : undefined).orderBy(financeCategory.transactionType, financeCategory.sortOrder, financeCategory.name);
}

export async function createFinanceCategory(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FINANCE_CATEGORY_MANAGE);
  const values = parseInput(financeCategorySchema.safeParse(input));
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(financeCategory).values({ id, name: values.name, transactionType: values.transactionType, isActive: true, sortOrder: values.sortOrder, createdBy: session.user.id, createdAt: now, updatedAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "FINANCE_CATEGORY", entityId: id, newValues: values }));
  });
  return { id };
}

export async function updateFinanceCategory(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FINANCE_CATEGORY_MANAGE);
  const values = parseInput(updateFinanceCategorySchema.safeParse(input));
  const [current] = await getDb().select().from(financeCategory).where(eq(financeCategory.id, values.id)).limit(1);
  if (!current) throw new Error("Finance category was not found.");
  await getDb().transaction(async (tx) => {
    await tx.update(financeCategory).set({ name: values.name, transactionType: values.transactionType, isActive: values.isActive, sortOrder: values.sortOrder, updatedAt: new Date() }).where(eq(financeCategory.id, values.id));
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "FINANCE_CATEGORY", entityId: values.id, oldValues: { name: current.name, transactionType: current.transactionType, isActive: current.isActive, sortOrder: current.sortOrder }, newValues: values }));
  });
  return { id: values.id };
}

export async function createFinancialTransactionUploadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.FINANCE_CREATE);
  const values = parseInput(financialTransactionUploadSchema.safeParse(input));
  validateUpload(values);
  const upload = await getObjectStorage().createUploadUrl({ ...values, scope: financialTransactionScope(values.transactionId) });
  assertFinancialEvidenceKey(values.transactionId, upload.key);
  return { key: upload.key, uploadUrl: upload.uploadUrl };
}

export async function getFinancialTransactionEvidenceDownloadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.FINANCE_READ);
  const values = parseInput(financialTransactionEvidenceDownloadSchema.safeParse(input));
  const [item] = await getDb().select({ evidenceKey: financialTransaction.evidenceKey }).from(financialTransaction).where(eq(financialTransaction.id, values.id)).limit(1);
  if (!item?.evidenceKey) throw new Error("Transaction evidence was not found.");
  return { downloadUrl: await getObjectStorage().createDownloadUrl(item.evidenceKey) };
}

type TransactionContext = Pick<ReturnType<typeof getDb>, "insert" | "update">;

export async function reverseFinancialTransactionRecord(tx: TransactionContext, current: typeof financialTransaction.$inferSelect, actorUserId: string, reason: string) {
  if (current.status !== "SAH") throw new Error("Only approved financial transactions can be reversed.");
  const reversalId = crypto.randomUUID();
  const now = new Date();
  const reversalType = current.transactionType === "CASH_IN" ? "CASH_OUT" : "CASH_IN";
  const [updateResult] = await tx.update(financialTransaction).set({ status: "REVERSED", updatedAt: now }).where(and(eq(financialTransaction.id, current.id), eq(financialTransaction.status, "SAH")));
  if (updateResult.affectedRows !== 1) throw new Error("Financial transaction was already processed.");
  await tx.insert(financialTransaction).values({
    id: reversalId,
    transactionCode: createTransactionCode(),
    transactionAt: now,
    transactionType: reversalType,
    amount: current.amount,
    description: `Reversal of ${current.transactionCode}: ${reason}`,
    relatedEntityType: "FINANCIAL_TRANSACTION",
    relatedEntityId: current.id,
    evidenceKey: null,
    status: "SAH",
    createdBy: actorUserId,
    approvedBy: actorUserId,
    reversedTransactionId: current.id,
    createdAt: now,
    updatedAt: now,
  });
  await tx.insert(auditLog).values(createAuditLogValues({ actorUserId, action: AUDIT_ACTIONS.REVERSE, entityType: "FINANCIAL_TRANSACTION", entityId: current.id, oldValues: { status: "SAH" }, newValues: { status: "REVERSED", reversalId, reason } }));
  return reversalId;
}

export async function getFinancialTransactions(status?: "DRAFT" | "SAH" | "REVERSED") {
  await requirePermission(PERMISSIONS.FINANCE_READ);
  const database = getDb();
  const query = database.select().from(financialTransaction);
  return status
    ? query.where(eq(financialTransaction.status, status)).orderBy(desc(financialTransaction.transactionAt)).limit(100)
    : query.orderBy(desc(financialTransaction.transactionAt)).limit(100);
}

export async function getFinancialTransaction(id: string) {
  await requirePermission(PERMISSIONS.FINANCE_READ);
  const validId = z.string().uuid("Invalid transaction ID.").parse(id);
  const [item] = await getDb().select().from(financialTransaction).where(eq(financialTransaction.id, validId)).limit(1);
  return item ?? null;
}

export async function getFinancialTransactionsPage(input?: unknown) {
  await requirePermission(PERMISSIONS.FINANCE_READ);
  const values = financialTransactionFiltersSchema.parse(input ?? {});
  const periodRange = values.dateFrom || values.dateTo ? { start: values.dateFrom ? startOfJakartaDay(values.dateFrom) : new Date("1970-01-01T00:00:00.000Z"), end: values.dateTo ? nextJakartaDay(values.dateTo) : new Date("2999-12-31T00:00:00.000Z") } : values.periodKey ? { start: new Date(`${values.periodKey}-01T00:00:00.000Z`), end: new Date(`${values.periodKey}-01T00:00:00.000Z`) } : null;
  if (periodRange) periodRange.end.setUTCMonth(periodRange.end.getUTCMonth() + 1);
  const conditions = [
    values.status ? eq(financialTransaction.status, values.status) : undefined,
    values.transactionType ? eq(financialTransaction.transactionType, values.transactionType) : undefined,
    values.relatedEntityType ? eq(financialTransaction.relatedEntityType, values.relatedEntityType) : undefined,
    values.categoryId ? eq(financialTransaction.categoryId, values.categoryId) : undefined,
    values.query ? or(
      like(financialTransaction.transactionCode, `%${values.query}%`),
      like(financialTransaction.description, `%${values.query}%`),
    ) : undefined,
    periodRange ? gte(financialTransaction.transactionAt, periodRange.start) : undefined,
    periodRange ? lt(financialTransaction.transactionAt, periodRange.end) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const where = conditions.length ? and(...conditions) : undefined;
  const database = getDb();
  const [items, [{ total }]] = await Promise.all([
    database.select().from(financialTransaction).where(where).orderBy(desc(financialTransaction.transactionAt)).limit(values.pageSize).offset((values.page - 1) * values.pageSize),
    database.select({ total: count() }).from(financialTransaction).where(where),
  ]);
  return { items, page: values.page, pageSize: values.pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / values.pageSize) };
}

export async function getFinanceSummary(input?: { dateFrom?: string; dateTo?: string }) {
  await requirePermission(PERMISSIONS.FINANCE_READ);
  const database = getDb();
  const dateFrom = input?.dateFrom;
  const dateToExclusive = input?.dateTo ? nextDate(input.dateTo) : undefined;
  const transactionDate = [dateFrom ? gte(financialTransaction.transactionAt, startOfJakartaDay(dateFrom)) : undefined, dateToExclusive ? lt(financialTransaction.transactionAt, startOfJakartaDay(dateToExclusive)) : undefined].filter(Boolean);
  const paymentDate = [dateFrom ? gte(duePayment.paymentDate, dateFrom) : undefined, dateToExclusive ? lt(duePayment.paymentDate, dateToExclusive) : undefined].filter(Boolean);
  const realizationDate = [dateFrom ? gte(realizationRequest.realizationDate, dateFrom) : undefined, dateToExclusive ? lt(realizationRequest.realizationDate, dateToExclusive) : undefined].filter(Boolean);
  const [transactionGroups, [duePaymentTotals], [duePaymentTransactionTotals], [realizationTotals], [realizationTransactionTotals]] = await Promise.all([
    database
      .select({ status: financialTransaction.status, transactionType: financialTransaction.transactionType, total: sum(financialTransaction.amount), totalCount: count() })
      .from(financialTransaction)
      .where(transactionDate.length ? and(...transactionDate) : undefined)
      .groupBy(financialTransaction.status, financialTransaction.transactionType),
    database.select({ total: sum(duePayment.amount) }).from(duePayment).where(paymentDate.length ? and(...paymentDate) : undefined),
    database
      .select({ total: sum(financialTransaction.amount) })
      .from(financialTransaction)
      .where(and(eq(financialTransaction.status, "SAH"), eq(financialTransaction.transactionType, "CASH_IN"), eq(financialTransaction.relatedEntityType, "DUE_PAYMENT"), ...transactionDate)),
    database.select({ total: sum(realizationRequest.requestedAmount) }).from(realizationRequest).where(and(eq(realizationRequest.status, "SAH"), ...realizationDate)),
    database
      .select({ total: sum(financialTransaction.amount) })
      .from(financialTransaction)
      .where(and(eq(financialTransaction.status, "SAH"), eq(financialTransaction.transactionType, "CASH_OUT"), eq(financialTransaction.relatedEntityType, "REALIZATION"), ...transactionDate)),
  ]);

  let cashIn = 0;
  let cashOut = 0;
  let transactionCount = 0;
  let draftCount = 0;
  let approvedCount = 0;
  let reversedCount = 0;
  for (const group of transactionGroups) {
    const total = numericTotal(group.total);
    const groupCount = Number(group.totalCount);
    transactionCount += groupCount;
    if (group.status === "DRAFT") draftCount += groupCount;
    if (group.status === "SAH") approvedCount += groupCount;
    if (group.status === "REVERSED") reversedCount += groupCount;
    if (group.status === "SAH" || group.status === "REVERSED") {
      if (group.transactionType === "CASH_IN") cashIn += total;
      if (group.transactionType === "CASH_OUT") cashOut += total;
    }
  }

  const duePaymentTotal = numericTotal(duePaymentTotals?.total);
  const duePaymentTransactionTotal = numericTotal(duePaymentTransactionTotals?.total);
  const realizationTotal = numericTotal(realizationTotals?.total);
  const realizationTransactionTotal = numericTotal(realizationTransactionTotals?.total);
  return {
    cashIn,
    cashOut,
    cashBalance: cashIn - cashOut,
    transactionCount,
    draftCount,
    approvedCount,
    reversedCount,
    reconciliation: {
      duePaymentTotal,
      duePaymentTransactionTotal,
      realizationTotal,
      realizationTransactionTotal,
      duePaymentDifference: duePaymentTotal - duePaymentTransactionTotal,
      realizationDifference: realizationTotal - realizationTransactionTotal,
      reconciled: duePaymentTotal === duePaymentTransactionTotal && realizationTotal === realizationTransactionTotal,
    },
  };
}

function nextDate(value: string): string { const date = new Date(`${value}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); }

export async function getCashBalance() {
  await requirePermission(PERMISSIONS.FINANCE_READ);
  const database = getDb();
  const [[cashIn], [cashOut]] = await Promise.all([
    database.select({ total: sum(financialTransaction.amount) }).from(financialTransaction).where(and(inArray(financialTransaction.status, ["SAH", "REVERSED"]), eq(financialTransaction.transactionType, "CASH_IN"))),
    database.select({ total: sum(financialTransaction.amount) }).from(financialTransaction).where(and(inArray(financialTransaction.status, ["SAH", "REVERSED"]), eq(financialTransaction.transactionType, "CASH_OUT"))),
  ]);

  return numericTotal(cashIn?.total) - numericTotal(cashOut?.total);
}

export async function createFinancialTransaction(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FINANCE_CREATE);
  const values = parseInput(createFinancialTransactionSchema.safeParse(input));
  await assertActiveFinanceCategory(values.categoryId, values.transactionType);
  if (values.evidenceKey) assertFinancialEvidenceKey(values.idempotencyKey, values.evidenceKey);
  const transactionCode = idempotentTransactionCode(values.idempotencyKey);
  const id = crypto.randomUUID();
  const now = new Date();
  await getDb().transaction(async (tx) => {
    const [existing] = await tx.select().from(financialTransaction).where(eq(financialTransaction.transactionCode, transactionCode)).limit(1);
    if (existing) {
      if (!sameTransactionPayload(existing, values)) throw new Error("This idempotency key was already used for different transaction data.");
      return;
    }
    await tx.insert(financialTransaction).values({
      id,
      transactionCode,
      transactionAt: values.transactionAt ?? now,
      transactionType: values.transactionType,
      amount: values.amount,
      description: values.description,
      categoryId: values.categoryId ?? null,
      relatedEntityType: optionalValue(values.relatedEntityType),
      relatedEntityId: values.relatedEntityId ?? null,
      evidenceKey: optionalValue(values.evidenceKey),
      status: "DRAFT",
      createdBy: session.user.id,
      approvedBy: null,
      reversedTransactionId: null,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.CREATE,
        entityType: "FINANCIAL_TRANSACTION",
        entityId: id,
        newValues: { type: values.transactionType, amount: values.amount, status: "DRAFT" },
      }),
    );
  });
  const [existing] = await getDb().select({ id: financialTransaction.id, status: financialTransaction.status }).from(financialTransaction).where(eq(financialTransaction.transactionCode, transactionCode)).limit(1);
  return { id: existing?.id ?? id, status: existing?.status ?? "DRAFT", duplicate: existing?.id !== id };
}

export async function approveFinancialTransaction(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FINANCE_APPROVE);
  const values = parseInput(approveFinancialTransactionSchema.safeParse(input));
  const database = getDb();
  const [current] = await database
    .select()
    .from(financialTransaction)
    .where(eq(financialTransaction.id, values.id))
    .limit(1);
  if (!current) throw new Error("Financial transaction was not found.");
  if (current.status !== "DRAFT") throw new Error("Only draft financial transactions can be approved.");

  await database.transaction(async (tx) => {
    const [updateResult] = await tx
      .update(financialTransaction)
      .set({ status: "SAH", approvedBy: session.user.id, updatedAt: new Date() })
      .where(and(eq(financialTransaction.id, current.id), eq(financialTransaction.status, "DRAFT")));
    if (updateResult.affectedRows !== 1) throw new Error("Financial transaction was already processed.");
    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.APPROVE,
        entityType: "FINANCIAL_TRANSACTION",
        entityId: current.id,
        oldValues: { status: "DRAFT" },
        newValues: { status: "SAH" },
      }),
    );
  });
  return { id: current.id, status: "SAH" };
}

export async function reverseFinancialTransaction(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FINANCE_APPROVE);
  const values = parseInput(reverseFinancialTransactionSchema.safeParse(input));
  const database = getDb();
  const [current] = await database
    .select()
    .from(financialTransaction)
    .where(eq(financialTransaction.id, values.id))
    .limit(1);
  if (!current) throw new Error("Financial transaction was not found.");
  if (current.status !== "SAH") throw new Error("Only approved financial transactions can be reversed.");

  let reversalId = "";
  await database.transaction(async (tx) => {
    reversalId = await reverseFinancialTransactionRecord(tx, current, session.user.id, values.reason);
  });
  return { id: reversalId, reversedTransactionId: current.id };
}
