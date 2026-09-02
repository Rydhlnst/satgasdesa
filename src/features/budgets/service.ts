import { and, count, desc, eq, gte, inArray, like, lte, ne, or } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { budgetCategory, budgetChangeRequest, budgetChangeRequestAttachment, budgetGroup, budgetItem, budgetItemAttachment, budgetItemProgressHistory, budgetPeriod, budgetPeriodAttachment, budgetPeriodHistory, budgetRevision, budgetSubcategory, realizationRequest } from "@/src/db/schema/budgets";
import { financialTransaction } from "@/src/db/schema/finance";
import { fundRequest } from "@/src/db/schema/fund-requests";
import { realizationApproval, realizationEvidence } from "@/src/db/schema/history-evidence";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getObjectStorage, validateUpload } from "@/src/lib/storage";
import { parseValidatedInput } from "@/src/lib/validation";
import { createSystemNotificationOnce, notifyPermissionHolders } from "@/src/features/notifications/service";
import { reverseFinancialTransactionRecord } from "@/src/features/finance/service";

import { assertRealizationAmountAvailable as assertRemainingAllocation } from "./allocation-rules";
import { allocationControlStatus, allocationPercent, type AllocationControlStatus } from "./allocation-controls";
import { BUDGET_PERIOD_STATUSES, INITIAL_BUDGET_GROUPS, REALIZATION_TRANSITIONS } from "./constants";
import { addBudgetCategoryToPeriodSchema, addBudgetChangeRequestAttachmentSchema, addBudgetItemAttachmentSchema, addBudgetPeriodAttachmentSchema, addRealizationEvidenceSchema, approveBudgetPeriodSchema, budgetCategoryFiltersSchema, budgetChangeRequestAttachmentDownloadSchema, budgetChangeRequestAttachmentUploadSchema, budgetItemAttachmentDownloadSchema, budgetItemAttachmentUploadSchema, budgetPeriodAttachmentDownloadSchema, budgetPeriodAttachmentUploadSchema, budgetPeriodFiltersSchema, budgetChangeRequestTransitionSchema, createBudgetCategorySchema, createBudgetChangeRequestSchema, correctRealizationSchema, createBudgetItemSchema, createBudgetPeriodSchema, createBudgetSubcategorySchema, createRealizationSchema, deleteBudgetItemSchema, realizationEvidenceDownloadSchema, realizationEvidenceUploadSchema, realizationFiltersSchema, reverseRealizationSchema, reviseBudgetItemSchema, transitionRealizationSchema, updateBudgetCategorySchema, updateBudgetItemProgressSchema, updateBudgetItemSchema, updateBudgetSubcategorySchema, updateRealizationSchema, verifyBudgetPeriodSchema } from "./schema";

function parseInput<T>(result: { success: boolean; data?: T; error?: unknown }): T {
  return parseValidatedInput(result, "Please check the budget details and try again.");
}

function optionalValue(value?: string): string | null { return value?.trim() ? value.trim() : null; }
function financeCode(): string { return `TX-REAL-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`; }
function budgetItemAttachmentScope(budgetItemId: string): string { return `budget-items/${budgetItemId}`; }
function assertBudgetItemAttachmentKey(budgetItemId: string, storageKey: string): void {
  const scope = `${budgetItemAttachmentScope(budgetItemId)}/`;
  if (!storageKey.startsWith(scope) || storageKey.slice(scope.length).includes("/") || storageKey.includes("..") || storageKey.includes("\\")) throw new Error("Budget attachment is outside the permitted storage scope.");
}
function budgetPeriodAttachmentScope(periodId: string): string { return `budget-periods/${periodId}/rab`; }
function assertBudgetPeriodAttachmentKey(periodId: string, storageKey: string): void {
  const scope = `${budgetPeriodAttachmentScope(periodId)}/`;
  if (!storageKey.startsWith(scope) || storageKey.slice(scope.length).includes("/") || storageKey.includes("..") || storageKey.includes("\\")) throw new Error("RAB attachment is outside the permitted storage scope.");
}
function budgetChangeRequestAttachmentScope(changeRequestId: string): string { return `budget-change-requests/${changeRequestId}`; }
function assertBudgetChangeRequestAttachmentKey(changeRequestId: string, storageKey: string): void {
  const scope = `${budgetChangeRequestAttachmentScope(changeRequestId)}/`;
  if (!storageKey.startsWith(scope) || storageKey.slice(scope.length).includes("/") || storageKey.includes("..") || storageKey.includes("\\")) throw new Error("Change order attachment is outside the permitted storage scope.");
}
function realizationEvidenceScope(realizationId: string): string { return `realizations/${realizationId}`; }
function assertRealizationEvidenceKey(realizationId: string, storageKey: string): void {
  const scope = `${realizationEvidenceScope(realizationId)}/`;
  if (!storageKey.startsWith(scope) || storageKey.slice(scope.length).includes("/") || storageKey.includes("..") || storageKey.includes("\\")) throw new Error("Realization evidence is outside the permitted storage scope.");
}

type BudgetPeriodStatus = (typeof BUDGET_PERIOD_STATUSES)[number];

async function getBudgetPeriodOrThrow(id: string) {
  const [period] = await getDb().select().from(budgetPeriod).where(eq(budgetPeriod.id, id)).limit(1);
  if (!period) throw new Error("Budget period was not found.");
  return period;
}

async function getBudgetAllocationSnapshot(periodId: string) {
  const period = await getBudgetPeriodOrThrow(periodId);
  const items = await getDb()
    .select({ id: budgetItem.id, groupId: budgetGroup.id, allocatedAmount: budgetItem.allocatedAmount })
    .from(budgetItem)
    .innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId))
    .where(eq(budgetGroup.periodId, periodId));
  const realizations = await getDb()
    .select({ requestedAmount: realizationRequest.requestedAmount, status: realizationRequest.status, isOverAllocation: realizationRequest.isOverAllocation })
    .from(realizationRequest)
    .innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId))
    .innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId))
    .where(eq(budgetGroup.periodId, periodId));
  const totalAllocation = items.reduce((total, item) => total + item.allocatedAmount, 0);
  const approvedRealization = realizations.filter((item) => item.status === "SAH").reduce((total, item) => total + item.requestedAmount, 0);
  const pendingRealization = realizations.filter((item) => item.status === "SUBMITTED" || item.status === "VERIFIED").reduce((total, item) => total + item.requestedAmount, 0);
  const availableFunds = period.openingBalance + period.estimatedIncome;
  const remainingAllocation = totalAllocation - approvedRealization - pendingRealization;
  return {
    period,
    totalAllocation,
    availableFunds,
    unallocatedFunds: availableFunds - totalAllocation,
    approvedRealization,
    pendingRealization,
    remainingAllocation,
    absorptionPercentage: totalAllocation ? Math.round((approvedRealization / totalAllocation) * 10_000) / 100 : 0,
    overAllocatedRealizations: realizations.filter((item) => item.isOverAllocation === 1).length,
    items,
  };
}

async function assertAllocationWithinFunds(periodId: string, nextAmount: number, excludedItemId?: string) {
  const snapshot = await getBudgetAllocationSnapshot(periodId);
  const currentAllocation = snapshot.items.filter((item) => item.id !== excludedItemId).reduce((total, item) => total + item.allocatedAmount, 0);
  if (currentAllocation + nextAmount > snapshot.availableFunds) throw new Error("Budget allocation cannot exceed available funds.");
}

function assertPeriodStatus(status: string, expected: BudgetPeriodStatus): void {
  if (status !== expected) throw new Error(`Budget period must be ${expected.toLowerCase()} before this action.`);
}

async function getDraftGroup(groupId: string) {
  const [group] = await getDb().select().from(budgetGroup).where(eq(budgetGroup.id, groupId)).limit(1);
  if (!group) throw new Error("Budget group was not found.");
  const [period] = await getDb().select().from(budgetPeriod).where(eq(budgetPeriod.id, group.periodId)).limit(1);
  if (!period || period.status !== "DRAFT") throw new Error("Budget period is no longer editable.");
  return group;
}

async function getDraftBudgetItem(itemId: string) {
  const item = await getBudgetItemOrThrow(itemId);
  const group = await getDraftGroup(item.groupId);
  return { item, group };
}

async function assertSubcategoryMatchesGroup(subcategoryId: string | undefined, group: typeof budgetGroup.$inferSelect): Promise<void> {
  if (!subcategoryId) return;
  if (!group.categoryId) throw new Error("This budget category must be assigned before using a subcategory.");
  const [subcategory] = await getDb().select({ categoryId: budgetSubcategory.categoryId, isActive: budgetSubcategory.isActive }).from(budgetSubcategory).where(eq(budgetSubcategory.id, subcategoryId)).limit(1);
  if (!subcategory || subcategory.isActive !== 1 || subcategory.categoryId !== group.categoryId) throw new Error("Select an active subcategory belonging to the selected budget category.");
}

async function getOrCreateDefaultBudgetCategories(actorUserId: string) {
  const database = getDb();
  const activeCategories = await database.select().from(budgetCategory).where(eq(budgetCategory.isActive, 1)).orderBy(budgetCategory.sortOrder, budgetCategory.name);
  if (activeCategories.length) return activeCategories;
  const now = new Date();
  try {
    await database.transaction(async (tx) => {
      await tx.insert(budgetCategory).values(INITIAL_BUDGET_GROUPS.map((name, sortOrder) => ({ id: crypto.randomUUID(), name, isActive: 1, sortOrder, createdBy: actorUserId, createdAt: now, updatedAt: now })));
    });
  } catch {
    // Another user can initialize the default master data concurrently.
  }
  const categories = await database.select().from(budgetCategory).where(eq(budgetCategory.isActive, 1)).orderBy(budgetCategory.sortOrder, budgetCategory.name);
  if (!categories.length) throw new Error("At least one active budget category is required.");
  return categories;
}

async function getRealizationCalculationSnapshot(budgetItemId: string, excludeRealizationId?: string) {
  const item = await getBudgetItemOrThrow(budgetItemId);
  const rows = await getDb().select({ id: realizationRequest.id, requestedAmount: realizationRequest.requestedAmount, status: realizationRequest.status, isOverAllocation: realizationRequest.isOverAllocation, correctsRealizationId: realizationRequest.correctsRealizationId }).from(realizationRequest).where(and(eq(realizationRequest.budgetItemId, budgetItemId), inArray(realizationRequest.status, ["SUBMITTED", "VERIFIED", "SAH"]), excludeRealizationId ? ne(realizationRequest.id, excludeRealizationId) : undefined));
  const replacedIds = new Set(rows.flatMap((row) => row.correctsRealizationId ? [row.correctsRealizationId] : []));
  const effectiveRows = rows.filter((row) => !replacedIds.has(row.id));
  const approvedRealization = effectiveRows.filter((row) => row.status === "SAH").reduce((total, row) => total + row.requestedAmount, 0);
  const pendingRealization = effectiveRows.filter((row) => row.status === "SUBMITTED" || row.status === "VERIFIED").reduce((total, row) => total + row.requestedAmount, 0);
  const committedRealization = approvedRealization + pendingRealization;
  return { item, allocation: item.allocatedAmount, approvedRealization, pendingRealization, committedRealization, remainingAllocation: item.allocatedAmount - committedRealization, overAllocationAmount: Math.max(0, committedRealization - item.allocatedAmount), overAllocatedRequests: effectiveRows.filter((row) => row.isOverAllocation === 1).length };
}

function calculationSnapshotValues(snapshot: Awaited<ReturnType<typeof getRealizationCalculationSnapshot>>) {
  return { allocation: snapshot.allocation, approvedRealization: snapshot.approvedRealization, pendingRealization: snapshot.pendingRealization, committedRealization: snapshot.committedRealization, remainingAllocation: snapshot.remainingAllocation };
}

async function getRealizationContext(budgetItemId: string, fundRequestId?: string) {
  const database = getDb();
  const item = await getBudgetItemOrThrow(budgetItemId);
  const [group] = await database.select().from(budgetGroup).where(eq(budgetGroup.id, item.groupId)).limit(1);
  const [period] = group ? await database.select().from(budgetPeriod).where(eq(budgetPeriod.id, group.periodId)).limit(1) : [];
  if (!group || !period || period.status !== "APPROVED") throw new Error("Realizations require an approved budget period.");
  if (!fundRequestId) return { item, group, period, fundRequest: null };
  const [request] = await database.select().from(fundRequest).where(eq(fundRequest.id, fundRequestId)).limit(1);
  if (!request || request.status !== "APPROVED") throw new Error("Linked fund request must be approved.");
  if (request.budgetPeriodId !== period.id || (group.categoryId && request.budgetCategoryId !== group.categoryId)) throw new Error("Linked fund request does not match the selected budget allocation.");
  return { item, group, period, fundRequest: request };
}

async function assertEditableRealization(id: string, actorUserId: string) {
  const [realization] = await getDb().select().from(realizationRequest).where(eq(realizationRequest.id, id)).limit(1);
  if (!realization) throw new Error("Realization was not found.");
  if (realization.createdBy !== actorUserId) throw new Error("Only the realization creator can modify this record.");
  if (realization.status !== "DRAFT" && realization.status !== "REVISION_REQUIRED") throw new Error("Only draft or revision-required realizations can be modified.");
  return realization;
}

async function assertRealizationAmountAvailable(budgetItemId: string, requestedAmount: number, excludeRealizationId?: string) {
  const snapshot = await getRealizationCalculationSnapshot(budgetItemId, excludeRealizationId);
  assertRemainingAllocation(snapshot.remainingAllocation, requestedAmount);
  return snapshot;
}

export async function getBudgetCategories(input?: unknown) {
  await requirePermission(PERMISSIONS.BUDGET_READ);
  const values = budgetCategoryFiltersSchema.parse(input ?? {});
  const conditions = [
    values.categoryId ? eq(budgetCategory.id, values.categoryId) : undefined,
    values.includeInactive ? undefined : eq(budgetCategory.isActive, 1),
    values.query ? like(budgetCategory.name, `%${values.query}%`) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const categories = await getDb().select().from(budgetCategory).where(conditions.length ? and(...conditions) : undefined).orderBy(budgetCategory.sortOrder, budgetCategory.name);
  if (!categories.length) return [];
  const subcategories = await getDb().select().from(budgetSubcategory).where(inArray(budgetSubcategory.categoryId, categories.map((category) => category.id))).orderBy(budgetSubcategory.sortOrder, budgetSubcategory.name);
  return categories.map((category) => ({ ...category, subcategories: subcategories.filter((subcategory) => subcategory.categoryId === category.id && (values.includeInactive || subcategory.isActive === 1)) }));
}

export async function createBudgetCategory(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CATEGORY_MANAGE);
  const values = parseInput(createBudgetCategorySchema.safeParse(input));
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(budgetCategory).values({ id, ...values, isActive: 1, createdBy: session.user.id, createdAt: now, updatedAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BUDGET_CATEGORY", entityId: id, newValues: values }));
  });
  return { id };
}

export async function updateBudgetCategory(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CATEGORY_MANAGE);
  const values = parseInput(updateBudgetCategorySchema.safeParse(input));
  const [current] = await getDb().select().from(budgetCategory).where(eq(budgetCategory.id, values.id)).limit(1);
  if (!current) throw new Error("Budget category was not found.");
  await getDb().transaction(async (tx) => {
    await tx.update(budgetCategory).set({ name: values.name, isActive: values.isActive ? 1 : 0, sortOrder: values.sortOrder, updatedAt: new Date() }).where(eq(budgetCategory.id, current.id));
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "BUDGET_CATEGORY", entityId: current.id, oldValues: { name: current.name, isActive: current.isActive, sortOrder: current.sortOrder }, newValues: values }));
  });
  return { id: current.id };
}

export async function createBudgetSubcategory(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CATEGORY_MANAGE);
  const values = parseInput(createBudgetSubcategorySchema.safeParse(input));
  const [category] = await getDb().select({ id: budgetCategory.id, isActive: budgetCategory.isActive }).from(budgetCategory).where(eq(budgetCategory.id, values.categoryId)).limit(1);
  if (!category || category.isActive !== 1) throw new Error("Select an active budget category.");
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(budgetSubcategory).values({ id, ...values, isActive: 1, createdBy: session.user.id, createdAt: now, updatedAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BUDGET_SUBCATEGORY", entityId: id, newValues: values }));
  });
  return { id };
}

export async function updateBudgetSubcategory(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CATEGORY_MANAGE);
  const values = parseInput(updateBudgetSubcategorySchema.safeParse(input));
  const [current, category] = await Promise.all([
    getDb().select().from(budgetSubcategory).where(eq(budgetSubcategory.id, values.id)).limit(1).then((rows) => rows[0]),
    getDb().select({ id: budgetCategory.id, isActive: budgetCategory.isActive }).from(budgetCategory).where(eq(budgetCategory.id, values.categoryId)).limit(1).then((rows) => rows[0]),
  ]);
  if (!current) throw new Error("Budget subcategory was not found.");
  if (!category || category.isActive !== 1) throw new Error("Select an active budget category.");
  if (current.categoryId !== values.categoryId) {
    const [{ total }] = await getDb().select({ total: count() }).from(budgetItem).where(eq(budgetItem.subcategoryId, current.id));
    if (Number(total) > 0) throw new Error("A subcategory used by budget allocations cannot be moved to another category.");
  }
  await getDb().transaction(async (tx) => {
    await tx.update(budgetSubcategory).set({ categoryId: values.categoryId, name: values.name, isActive: values.isActive ? 1 : 0, sortOrder: values.sortOrder, updatedAt: new Date() }).where(eq(budgetSubcategory.id, current.id));
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "BUDGET_SUBCATEGORY", entityId: current.id, oldValues: { categoryId: current.categoryId, name: current.name, isActive: current.isActive, sortOrder: current.sortOrder }, newValues: values }));
  });
  return { id: current.id };
}

export async function getBudgetPeriods(input?: unknown) {
  await requirePermission(PERMISSIONS.BUDGET_READ);
  const values = budgetPeriodFiltersSchema.parse(input ?? {});
  const conditions = [
    values.status ? eq(budgetPeriod.status, values.status) : undefined,
    values.periodKey ? eq(budgetPeriod.periodKey, values.periodKey) : undefined,
    values.query ? like(budgetPeriod.periodKey, `%${values.query}%`) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const where = conditions.length ? and(...conditions) : undefined;
  const database = getDb();
  const [periods, [{ total }]] = await Promise.all([
    database.select().from(budgetPeriod).where(where).orderBy(desc(budgetPeriod.periodKey)).limit(values.pageSize).offset((values.page - 1) * values.pageSize),
    database.select({ total: count() }).from(budgetPeriod).where(where),
  ]);
  const items = await Promise.all(periods.map(async (period) => {
    const snapshot = await getBudgetAllocationSnapshot(period.id);
    return {
      ...period,
      totalAllocation: snapshot.totalAllocation,
      availableFunds: snapshot.availableFunds,
      unallocatedFunds: snapshot.unallocatedFunds,
      approvedRealization: snapshot.approvedRealization,
      pendingRealization: snapshot.pendingRealization,
      absorptionPercentage: snapshot.absorptionPercentage,
    };
  }));
  return { items, page: values.page, pageSize: values.pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / values.pageSize) };
}

export async function getBudgetSummary(periodId: string) {
  await requirePermission(PERMISSIONS.BUDGET_READ);
  return getBudgetAllocationSnapshot(z.string().uuid("Invalid budget period ID.").parse(periodId));
}

const legacyBudgetItemColumns = {
  id: budgetItem.id,
  groupId: budgetItem.groupId,
  subcategoryId: budgetItem.subcategoryId,
  name: budgetItem.name,
  allocatedAmount: budgetItem.allocatedAmount,
  notes: budgetItem.notes,
  createdAt: budgetItem.createdAt,
  updatedAt: budgetItem.updatedAt,
};

type LegacyBudgetItem = Pick<typeof budgetItem.$inferSelect, "id" | "groupId" | "subcategoryId" | "name" | "allocatedAmount" | "notes" | "createdAt" | "updatedAt">;

function withDefaultBudgetProgress(item: LegacyBudgetItem): typeof budgetItem.$inferSelect {
  return { ...item, progressPercentage: 0, progressNotes: null, progressUpdatedBy: null, progressUpdatedAt: null };
}

async function getBudgetItemById(itemId: string): Promise<typeof budgetItem.$inferSelect | null> {
  const database = getDb();
  try {
    const [item] = await database.select().from(budgetItem).where(eq(budgetItem.id, itemId)).limit(1);
    return item ?? null;
  } catch (error) {
    if (!isMissingBudgetProgressSchema(error)) throw error;
    const [item] = await database.select(legacyBudgetItemColumns).from(budgetItem).where(eq(budgetItem.id, itemId)).limit(1);
    return item ? withDefaultBudgetProgress(item) : null;
  }
}

async function getBudgetItemOrThrow(itemId: string): Promise<typeof budgetItem.$inferSelect> {
  const item = await getBudgetItemById(itemId);
  if (!item) throw new Error("Budget item was not found.");
  return item;
}

function isMissingBudgetProgressSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const mentionsProgressColumn = /progress_(percentage|notes|updated_by|updated_at)/i.test(message);
  const missingColumn = /unknown column|no such column|column .*does not exist|undefined column/i.test(message);
  const missingProgressHistory = /(?:table|relation).*budget_item_progress_history.*(?:does not exist|not found)/i.test(message);
  return (mentionsProgressColumn && missingColumn) || missingProgressHistory;
}

async function getBudgetPeriodItems(periodId: string) {
  const database = getDb();
  try {
    return await database
      .select({ item: budgetItem, groupId: budgetGroup.id, groupName: budgetGroup.name, subcategoryName: budgetSubcategory.name })
      .from(budgetItem)
      .innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId))
      .leftJoin(budgetSubcategory, eq(budgetSubcategory.id, budgetItem.subcategoryId))
      .where(eq(budgetGroup.periodId, periodId))
      .orderBy(budgetGroup.sortOrder, budgetItem.name);
  } catch (error) {
    if (!isMissingBudgetProgressSchema(error)) throw error;
    return getLegacyBudgetPeriodItems(periodId);
  }
}

function itemControl(item: { allocatedAmount: number; progressPercentage: number }, approvedRealization: number) {
  const absorptionPercentage = allocationPercent(approvedRealization, item.allocatedAmount);
  return {
    absorptionPercentage,
    controlStatus: allocationControlStatus({ allocatedAmount: item.allocatedAmount, approvedRealization, progressPercentage: item.progressPercentage }) satisfies AllocationControlStatus,
  };
}

function groupControl(items: Array<{ allocatedAmount: number; progressPercentage: number; approvedRealization: number; pendingRealization: number }>) {
  const totalAllocation = items.reduce((total, item) => total + item.allocatedAmount, 0);
  const approvedRealization = items.reduce((total, item) => total + item.approvedRealization, 0);
  const pendingRealization = items.reduce((total, item) => total + item.pendingRealization, 0);
  const weightedProgress = totalAllocation ? items.reduce((total, item) => total + item.allocatedAmount * item.progressPercentage, 0) / totalAllocation : 0;
  const controlStatuses = items.map((item) => allocationControlStatus({ allocatedAmount: item.allocatedAmount, approvedRealization: item.approvedRealization, progressPercentage: item.progressPercentage }));
  return {
    totalAllocation,
    approvedRealization,
    pendingRealization,
    remainingAllocation: totalAllocation - approvedRealization - pendingRealization,
    absorptionPercentage: allocationPercent(approvedRealization, totalAllocation),
    progressPercentage: Math.round(weightedProgress * 100) / 100,
    controlStatus: controlStatuses.includes("OVER_ALLOCATED") ? "OVER_ALLOCATED" : controlStatuses.includes("POTENTIAL_OVER_BUDGET") ? "POTENTIAL_OVER_BUDGET" : controlStatuses.includes("DELAYED_ABSORPTION") ? "DELAYED_ABSORPTION" : "ON_TRACK",
    controlStatusCounts: {
      overAllocated: controlStatuses.filter((status) => status === "OVER_ALLOCATED").length,
      potentialOverBudget: controlStatuses.filter((status) => status === "POTENTIAL_OVER_BUDGET").length,
      delayedAbsorption: controlStatuses.filter((status) => status === "DELAYED_ABSORPTION").length,
    },
  };
}

function withItemControl(item: typeof budgetItem.$inferSelect, approvedRealization: number, pendingRealization: number, subcategoryName: string | null, attachments: unknown[] = []) {
  return {
    ...item,
    subcategoryName,
    attachments,
    approvedRealization,
    pendingRealization,
    ...itemControl(item, approvedRealization),
  };
}

async function getLegacyBudgetPeriodItems(periodId: string) {
  const rows = await getDb()
    .select({ item: legacyBudgetItemColumns, groupId: budgetGroup.id, groupName: budgetGroup.name, subcategoryName: budgetSubcategory.name })
    .from(budgetItem)
    .innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId))
    .leftJoin(budgetSubcategory, eq(budgetSubcategory.id, budgetItem.subcategoryId))
    .where(eq(budgetGroup.periodId, periodId))
    .orderBy(budgetGroup.sortOrder, budgetItem.name);
  return rows.map((row) => ({ ...row, item: withDefaultBudgetProgress(row.item) }));
}

export async function getBudgetPeriodDetail(periodId: string) {
  await requirePermission(PERMISSIONS.BUDGET_READ);
  const validId = z.string().uuid("Invalid budget period ID.").parse(periodId);
  const period = await getBudgetPeriodOrThrow(validId);
  const [groups, items, revisions, realizations, attachments, history, periodAttachments, changeRequests, changeRequestAttachments] = await Promise.all([
    getDb().select().from(budgetGroup).where(eq(budgetGroup.periodId, validId)).orderBy(budgetGroup.sortOrder),
    getBudgetPeriodItems(validId),
    getDb().select({ revision: budgetRevision, itemName: budgetItem.name }).from(budgetRevision).innerJoin(budgetItem, eq(budgetItem.id, budgetRevision.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(eq(budgetGroup.periodId, validId)).orderBy(desc(budgetRevision.createdAt)),
    getDb().select({ budgetItemId: realizationRequest.budgetItemId, requestedAmount: realizationRequest.requestedAmount, status: realizationRequest.status }).from(realizationRequest).innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(eq(budgetGroup.periodId, validId)),
    getDb().select({ attachment: budgetItemAttachment }).from(budgetItemAttachment).innerJoin(budgetItem, eq(budgetItem.id, budgetItemAttachment.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(eq(budgetGroup.periodId, validId)).orderBy(desc(budgetItemAttachment.createdAt)),
    getDb().select().from(budgetPeriodHistory).where(eq(budgetPeriodHistory.periodId, validId)).orderBy(desc(budgetPeriodHistory.createdAt)),
    getDb().select().from(budgetPeriodAttachment).where(eq(budgetPeriodAttachment.periodId, validId)).orderBy(desc(budgetPeriodAttachment.createdAt)),
    getDb().select({ request: budgetChangeRequest, itemName: budgetItem.name }).from(budgetChangeRequest).innerJoin(budgetItem, eq(budgetItem.id, budgetChangeRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(eq(budgetGroup.periodId, validId)).orderBy(desc(budgetChangeRequest.createdAt)),
    getDb().select({ attachment: budgetChangeRequestAttachment }).from(budgetChangeRequestAttachment).innerJoin(budgetChangeRequest, eq(budgetChangeRequest.id, budgetChangeRequestAttachment.changeRequestId)).innerJoin(budgetItem, eq(budgetItem.id, budgetChangeRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(eq(budgetGroup.periodId, validId)).orderBy(desc(budgetChangeRequestAttachment.createdAt)),
  ]);
  const snapshot = await getBudgetAllocationSnapshot(validId);
  const groupsWithItems = groups.map((group) => {
    const groupItems = items.filter((entry) => entry.groupId === group.id).map((entry) => {
      const approvedRealization = realizations.filter((realization) => realization.budgetItemId === entry.item.id && realization.status === "SAH").reduce((total, realization) => total + realization.requestedAmount, 0);
      const pendingRealization = realizations.filter((realization) => realization.budgetItemId === entry.item.id && ["SUBMITTED", "VERIFIED"].includes(realization.status)).reduce((total, realization) => total + realization.requestedAmount, 0);
      return withItemControl(entry.item, approvedRealization, pendingRealization, entry.subcategoryName, attachments.filter((attachment) => (attachment.attachment as { budgetItemId: string }).budgetItemId === entry.item.id).map((attachment) => attachment.attachment));
    });
    return { ...group, ...groupControl(groupItems), items: groupItems };
  });
  const groupStatuses = groupsWithItems.map((group) => group.controlStatus);
  return {
    period,
    groups: groupsWithItems,
    revisions,
    periodAttachments,
    changeRequests: changeRequests.map((entry) => ({ ...entry.request, itemName: entry.itemName, attachments: changeRequestAttachments.filter((row) => row.attachment.changeRequestId === entry.request.id).map((row) => row.attachment) })),
    history,
    summary: {
      totalAllocation: snapshot.totalAllocation,
      availableFunds: snapshot.availableFunds,
      unallocatedFunds: snapshot.unallocatedFunds,
      approvedRealization: snapshot.approvedRealization,
      pendingRealization: snapshot.pendingRealization,
      remainingAllocation: snapshot.remainingAllocation,
      absorptionPercentage: snapshot.absorptionPercentage,
      overAllocatedRealizations: snapshot.overAllocatedRealizations,
      controlStatus: groupStatuses.includes("OVER_ALLOCATED") ? "OVER_ALLOCATED" : groupStatuses.includes("POTENTIAL_OVER_BUDGET") ? "POTENTIAL_OVER_BUDGET" : groupStatuses.includes("DELAYED_ABSORPTION") ? "DELAYED_ABSORPTION" : "ON_TRACK",
      controlStatusCounts: {
        overAllocated: groupsWithItems.reduce((total, group) => total + group.controlStatusCounts.overAllocated, 0),
        potentialOverBudget: groupsWithItems.reduce((total, group) => total + group.controlStatusCounts.potentialOverBudget, 0),
        delayedAbsorption: groupsWithItems.reduce((total, group) => total + group.controlStatusCounts.delayedAbsorption, 0),
      },
    },
  };
}

export async function getBudgetPeriodCategorySummary(periodId: string) {
  await requirePermission(PERMISSIONS.BUDGET_READ);
  const validId = z.string().uuid("Invalid budget period ID.").parse(periodId);
  const [period, groups, items, realizations] = await Promise.all([
    getBudgetPeriodOrThrow(validId),
    getDb().select().from(budgetGroup).where(eq(budgetGroup.periodId, validId)).orderBy(budgetGroup.sortOrder),
    getBudgetPeriodItems(validId),
    getDb().select({ budgetItemId: realizationRequest.budgetItemId, requestedAmount: realizationRequest.requestedAmount, status: realizationRequest.status }).from(realizationRequest).innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(eq(budgetGroup.periodId, validId)),
  ]);
  const snapshot = await getBudgetAllocationSnapshot(validId);
  const groupsWithItems = groups.map((group) => {
    const groupItems = items.filter((entry) => entry.groupId === group.id).map((entry) => {
      const approvedRealization = realizations.filter((realization) => realization.budgetItemId === entry.item.id && realization.status === "SAH").reduce((total, realization) => total + realization.requestedAmount, 0);
      const pendingRealization = realizations.filter((realization) => realization.budgetItemId === entry.item.id && ["SUBMITTED", "VERIFIED"].includes(realization.status)).reduce((total, realization) => total + realization.requestedAmount, 0);
      return withItemControl(entry.item, approvedRealization, pendingRealization, entry.subcategoryName);
    });
    return { ...group, ...groupControl(groupItems), items: groupItems };
  });
  const groupStatuses = groupsWithItems.map((group) => group.controlStatus);
  return {
    period,
    groups: groupsWithItems,
    summary: {
      totalAllocation: snapshot.totalAllocation,
      availableFunds: snapshot.availableFunds,
      unallocatedFunds: snapshot.unallocatedFunds,
      approvedRealization: snapshot.approvedRealization,
      pendingRealization: snapshot.pendingRealization,
      remainingAllocation: snapshot.remainingAllocation,
      absorptionPercentage: snapshot.absorptionPercentage,
      overAllocatedRealizations: snapshot.overAllocatedRealizations,
      controlStatus: groupStatuses.includes("OVER_ALLOCATED") ? "OVER_ALLOCATED" : groupStatuses.includes("POTENTIAL_OVER_BUDGET") ? "POTENTIAL_OVER_BUDGET" : groupStatuses.includes("DELAYED_ABSORPTION") ? "DELAYED_ABSORPTION" : "ON_TRACK",
      controlStatusCounts: {
        overAllocated: groupsWithItems.reduce((total, group) => total + group.controlStatusCounts.overAllocated, 0),
        potentialOverBudget: groupsWithItems.reduce((total, group) => total + group.controlStatusCounts.potentialOverBudget, 0),
        delayedAbsorption: groupsWithItems.reduce((total, group) => total + group.controlStatusCounts.delayedAbsorption, 0),
      },
    },
  };
}

export async function createBudgetPeriod(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CREATE);
  const values = parseInput(createBudgetPeriodSchema.safeParse(input));
  const database = getDb();
  const [existing] = await database.select({ id: budgetPeriod.id }).from(budgetPeriod).where(eq(budgetPeriod.periodKey, values.periodKey)).limit(1);
  if (existing) throw new Error("A budget period already exists for this month.");
  const categories = await getOrCreateDefaultBudgetCategories(session.user.id);
  const id = crypto.randomUUID(); const now = new Date();
  await database.transaction(async (tx) => {
    await tx.insert(budgetPeriod).values({ id, ...values, status: "DRAFT", approvalNotes: null, createdBy: session.user.id, approvedBy: null, createdAt: now, updatedAt: now });
    await tx.insert(budgetGroup).values(categories.map((category) => ({ id: crypto.randomUUID(), periodId: id, categoryId: category.id, name: category.name, sortOrder: category.sortOrder, createdAt: now })));
    await tx.insert(budgetPeriodHistory).values({ id: crypto.randomUUID(), periodId: id, budgetItemId: null, action: "CREATE", notes: `Budget period ${values.periodKey} created.`, createdBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BUDGET_PERIOD", entityId: id, newValues: { periodKey: values.periodKey } }));
  });
  return { id };
}

export async function addBudgetCategoryToPeriod(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CREATE);
  const values = parseInput(addBudgetCategoryToPeriodSchema.safeParse(input));
  const [period, category] = await Promise.all([
    getBudgetPeriodOrThrow(values.periodId),
    getDb().select().from(budgetCategory).where(eq(budgetCategory.id, values.categoryId)).limit(1).then((rows) => rows[0]),
  ]);
  assertPeriodStatus(period.status, "DRAFT");
  if (!category || category.isActive !== 1) throw new Error("Select an active budget category.");
  const [existing] = await getDb().select({ id: budgetGroup.id }).from(budgetGroup).where(and(eq(budgetGroup.periodId, period.id), eq(budgetGroup.categoryId, category.id))).limit(1);
  if (existing) throw new Error("This category is already assigned to the budget period.");
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(budgetGroup).values({ id, periodId: period.id, categoryId: category.id, name: category.name, sortOrder: category.sortOrder, createdAt: now });
    await tx.insert(budgetPeriodHistory).values({ id: crypto.randomUUID(), periodId: period.id, budgetItemId: null, action: "CATEGORY_ADDED", notes: category.name, createdBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BUDGET_GROUP", entityId: id, newValues: { periodId: period.id, categoryId: category.id } }));
  });
  return { id };
}

export async function createBudgetItem(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CREATE); const values = parseInput(createBudgetItemSchema.safeParse(input));
  const group = await getDraftGroup(values.groupId);
  await assertSubcategoryMatchesGroup(values.subcategoryId, group);
  await assertAllocationWithinFunds(group.periodId, values.allocatedAmount);
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(budgetItem).values({ id, groupId: values.groupId, subcategoryId: values.subcategoryId ?? null, name: values.name, allocatedAmount: values.allocatedAmount, notes: optionalValue(values.notes), createdAt: now, updatedAt: now });
    await tx.insert(budgetPeriodHistory).values({ id: crypto.randomUUID(), periodId: group.periodId, budgetItemId: id, action: "ITEM_CREATED", notes: values.name, createdBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BUDGET_ITEM", entityId: id, newValues: { groupId: values.groupId, allocatedAmount: values.allocatedAmount } }));
  }); return { id };
}

export async function reviseBudgetItem(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CREATE); const values = parseInput(reviseBudgetItemSchema.safeParse(input));
  const item = await getBudgetItemOrThrow(values.id); const group = await getDraftGroup(item.groupId); await assertAllocationWithinFunds(group.periodId, values.allocatedAmount, item.id);
  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.update(budgetItem).set({ allocatedAmount: values.allocatedAmount, updatedAt: now }).where(eq(budgetItem.id, item.id));
    await tx.insert(budgetRevision).values({ id: crypto.randomUUID(), budgetItemId: item.id, previousAmount: item.allocatedAmount, nextAmount: values.allocatedAmount, reason: values.reason, revisedBy: session.user.id, createdAt: now });
    await tx.insert(budgetPeriodHistory).values({ id: crypto.randomUUID(), periodId: group.periodId, budgetItemId: item.id, action: "ITEM_REVISED", notes: values.reason, createdBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "BUDGET_ITEM", entityId: item.id, oldValues: { allocatedAmount: item.allocatedAmount }, newValues: { allocatedAmount: values.allocatedAmount } }));
  }); return { id: item.id };
}

export async function updateBudgetItem(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CREATE);
  const values = parseInput(updateBudgetItemSchema.safeParse(input));
  const item = await getBudgetItemOrThrow(values.id);
  const group = await getDraftGroup(item.groupId);
  await assertSubcategoryMatchesGroup(values.subcategoryId, group);
  await assertAllocationWithinFunds(group.periodId, values.allocatedAmount, item.id);
  const now = new Date();
  await getDb().transaction(async (tx) => {
    const [updateResult] = await tx.update(budgetItem).set({ name: values.name, subcategoryId: values.subcategoryId ?? null, allocatedAmount: values.allocatedAmount, notes: optionalValue(values.notes), updatedAt: now }).where(and(eq(budgetItem.id, item.id), eq(budgetItem.updatedAt, item.updatedAt)));
    if (updateResult.affectedRows !== 1) throw new Error("This budget item was changed by another user. Refresh and try again.");
    await tx.insert(budgetRevision).values({ id: crypto.randomUUID(), budgetItemId: item.id, previousAmount: item.allocatedAmount, nextAmount: values.allocatedAmount, reason: "Draft allocation update", revisedBy: session.user.id, createdAt: now });
    await tx.insert(budgetPeriodHistory).values({ id: crypto.randomUUID(), periodId: group.periodId, budgetItemId: item.id, action: "ITEM_UPDATED", notes: values.name, createdBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "BUDGET_ITEM", entityId: item.id, oldValues: { name: item.name, subcategoryId: item.subcategoryId, allocatedAmount: item.allocatedAmount, notes: item.notes }, newValues: { name: values.name, subcategoryId: values.subcategoryId ?? null, allocatedAmount: values.allocatedAmount, notes: optionalValue(values.notes) } }));
  });
  return { id: item.id };
}

export async function deleteBudgetItem(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CREATE);
  const values = parseInput(deleteBudgetItemSchema.safeParse(input));
  const { item, group } = await getDraftBudgetItem(values.id);
  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.delete(budgetRevision).where(eq(budgetRevision.budgetItemId, item.id));
    await tx.delete(budgetItem).where(eq(budgetItem.id, item.id));
    await tx.insert(budgetPeriodHistory).values({ id: crypto.randomUUID(), periodId: group.periodId, budgetItemId: null, action: "ITEM_DELETED", notes: item.name, createdBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.DELETE, entityType: "BUDGET_ITEM", entityId: item.id, oldValues: { name: item.name, allocatedAmount: item.allocatedAmount } }));
  });
  return { id: item.id };
}

export async function updateBudgetItemProgress(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_PROGRESS_UPDATE);
  const values = parseInput(updateBudgetItemProgressSchema.safeParse(input));
  const [context] = await getDb().select({ item: budgetItem, period: budgetPeriod }).from(budgetItem).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).innerJoin(budgetPeriod, eq(budgetPeriod.id, budgetGroup.periodId)).where(eq(budgetItem.id, values.id)).limit(1);
  if (!context) throw new Error("Budget item was not found.");
  if (context.period.status !== "APPROVED") throw new Error("Progress can only be updated after the budget period is approved.");
  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.update(budgetItem).set({ progressPercentage: values.progressPercentage, progressNotes: optionalValue(values.notes), progressUpdatedBy: session.user.id, progressUpdatedAt: now, updatedAt: now }).where(eq(budgetItem.id, context.item.id));
    await tx.insert(budgetItemProgressHistory).values({ id: crypto.randomUUID(), budgetItemId: context.item.id, previousPercentage: context.item.progressPercentage, nextPercentage: values.progressPercentage, notes: optionalValue(values.notes), updatedBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "BUDGET_ITEM_PROGRESS", entityId: context.item.id, oldValues: { progressPercentage: context.item.progressPercentage }, newValues: { progressPercentage: values.progressPercentage, notes: optionalValue(values.notes) } }));
  });
  return { id: context.item.id, progressPercentage: values.progressPercentage };
}

export async function createBudgetItemAttachmentUploadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.BUDGET_CREATE);
  const values = parseInput(budgetItemAttachmentUploadSchema.safeParse(input));
  await getDraftBudgetItem(values.budgetItemId);
  validateUpload(values);
  const upload = await getObjectStorage().createUploadUrl({ ...values, scope: budgetItemAttachmentScope(values.budgetItemId) });
  assertBudgetItemAttachmentKey(values.budgetItemId, upload.key);
  return { key: upload.key, uploadUrl: upload.uploadUrl };
}

export async function addBudgetItemAttachment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CREATE);
  const values = parseInput(addBudgetItemAttachmentSchema.safeParse(input));
  const { item, group } = await getDraftBudgetItem(values.budgetItemId);
  assertBudgetItemAttachmentKey(item.id, values.storageKey);
  await getObjectStorage().verifyObject(values.storageKey, { contentType: values.contentType, size: values.sizeBytes, originalName: values.storageKey.split("/").at(-1) ?? "attachment" });
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(budgetItemAttachment).values({ id, budgetItemId: item.id, storageKey: values.storageKey, contentType: values.contentType, sizeBytes: values.sizeBytes, caption: optionalValue(values.caption), createdBy: session.user.id, createdAt: now });
    await tx.insert(budgetPeriodHistory).values({ id: crypto.randomUUID(), periodId: group.periodId, budgetItemId: item.id, action: "ATTACHMENT_ADDED", notes: optionalValue(values.caption), createdBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BUDGET_ITEM_ATTACHMENT", entityId: id, newValues: { budgetItemId: item.id, storageKey: values.storageKey } }));
  });
  return { id };
}

export async function getBudgetItemAttachmentDownloadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.BUDGET_READ);
  const values = parseInput(budgetItemAttachmentDownloadSchema.safeParse(input));
  const [attachment] = await getDb().select({ storageKey: budgetItemAttachment.storageKey }).from(budgetItemAttachment).where(and(eq(budgetItemAttachment.id, values.attachmentId), eq(budgetItemAttachment.budgetItemId, values.budgetItemId))).limit(1);
  if (!attachment) throw new Error("Budget attachment was not found.");
  assertBudgetItemAttachmentKey(values.budgetItemId, attachment.storageKey);
  return { downloadUrl: await getObjectStorage().createDownloadUrl(attachment.storageKey) };
}

export async function createBudgetPeriodAttachmentUploadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.BUDGET_CREATE);
  const values = parseInput(budgetPeriodAttachmentUploadSchema.safeParse(input));
  const period = await getBudgetPeriodOrThrow(values.periodId);
  if (period.status !== "DRAFT") throw new Error("RAB hanya dapat diunggah saat periode anggaran masih berupa draf.");
  validateUpload(values);
  const upload = await getObjectStorage().createUploadUrl({ ...values, scope: budgetPeriodAttachmentScope(values.periodId) });
  assertBudgetPeriodAttachmentKey(values.periodId, upload.key);
  return { key: upload.key, uploadUrl: upload.uploadUrl };
}

export async function addBudgetPeriodAttachment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CREATE);
  const values = parseInput(addBudgetPeriodAttachmentSchema.safeParse(input));
  const period = await getBudgetPeriodOrThrow(values.periodId);
  if (period.status !== "DRAFT") throw new Error("RAB hanya dapat ditambahkan saat periode anggaran masih berupa draf.");
  assertBudgetPeriodAttachmentKey(values.periodId, values.storageKey);
  await getObjectStorage().verifyObject(values.storageKey, { contentType: values.contentType, size: values.sizeBytes, originalName: values.storageKey.split("/").at(-1) ?? "rab.pdf" });
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(budgetPeriodAttachment).values({ id, periodId: values.periodId, storageKey: values.storageKey, contentType: values.contentType, sizeBytes: values.sizeBytes, caption: optionalValue(values.caption), createdBy: session.user.id, createdAt: now });
    await tx.insert(budgetPeriodHistory).values({ id: crypto.randomUUID(), periodId: values.periodId, budgetItemId: null, action: "RAB_ATTACHED", notes: optionalValue(values.caption), createdBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BUDGET_PERIOD_ATTACHMENT", entityId: id, newValues: { periodId: values.periodId, contentType: values.contentType, sizeBytes: values.sizeBytes } }));
  });
  return { id };
}

export async function getBudgetPeriodAttachmentDownloadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.BUDGET_READ);
  const values = parseInput(budgetPeriodAttachmentDownloadSchema.safeParse(input));
  const [attachment] = await getDb().select({ storageKey: budgetPeriodAttachment.storageKey }).from(budgetPeriodAttachment).where(and(eq(budgetPeriodAttachment.id, values.attachmentId), eq(budgetPeriodAttachment.periodId, values.periodId))).limit(1);
  if (!attachment) throw new Error("Dokumen RAB tidak ditemukan.");
  assertBudgetPeriodAttachmentKey(values.periodId, attachment.storageKey);
  return { downloadUrl: await getObjectStorage().createDownloadUrl(attachment.storageKey) };
}

async function getBudgetChangeRequestContext(id: string) {
  const [context] = await getDb().select({ request: budgetChangeRequest, item: budgetItem, group: budgetGroup, period: budgetPeriod }).from(budgetChangeRequest).innerJoin(budgetItem, eq(budgetItem.id, budgetChangeRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).innerJoin(budgetPeriod, eq(budgetPeriod.id, budgetGroup.periodId)).where(eq(budgetChangeRequest.id, id)).limit(1);
  if (!context) throw new Error("Pengajuan perubahan anggaran tidak ditemukan.");
  return context;
}

export async function createBudgetChangeRequest(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CREATE);
  const values = parseInput(createBudgetChangeRequestSchema.safeParse(input));
  const [context] = await getDb().select({ item: budgetItem, period: budgetPeriod }).from(budgetItem).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).innerJoin(budgetPeriod, eq(budgetPeriod.id, budgetGroup.periodId)).where(eq(budgetItem.id, values.budgetItemId)).limit(1);
  if (!context) throw new Error("Item alokasi anggaran tidak ditemukan.");
  if (context.period.status !== "APPROVED") throw new Error("Perubahan volume hanya dapat diajukan setelah anggaran disahkan.");
  if (context.item.allocatedAmount === values.proposedAmount) throw new Error("Jumlah perubahan harus berbeda dari alokasi saat ini.");
  const [openRequest] = await getDb().select({ id: budgetChangeRequest.id }).from(budgetChangeRequest).where(and(eq(budgetChangeRequest.budgetItemId, values.budgetItemId), inArray(budgetChangeRequest.status, ["DRAFT", "SUBMITTED", "VERIFIED"]))).limit(1);
  if (openRequest) throw new Error("Masih ada pengajuan perubahan anggaran yang menunggu proses.");
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().insert(budgetChangeRequest).values({ id, budgetItemId: values.budgetItemId, previousAmount: context.item.allocatedAmount, proposedAmount: values.proposedAmount, reason: values.reason, status: "DRAFT", rejectionReason: null, submittedAt: null, verifiedAt: null, approvedAt: null, createdBy: session.user.id, verifiedBy: null, approvedBy: null, createdAt: now, updatedAt: now });
  await getDb().insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BUDGET_CHANGE_REQUEST", entityId: id, newValues: { budgetItemId: values.budgetItemId, previousAmount: context.item.allocatedAmount, proposedAmount: values.proposedAmount, reason: values.reason } }));
  return { id };
}

export async function createBudgetChangeRequestAttachmentUploadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.BUDGET_CREATE);
  const values = parseInput(budgetChangeRequestAttachmentUploadSchema.safeParse(input));
  const context = await getBudgetChangeRequestContext(values.changeRequestId);
  if (context.request.status !== "DRAFT") throw new Error("Dokumen perubahan hanya dapat ditambahkan pada draf pengajuan.");
  validateUpload(values);
  const upload = await getObjectStorage().createUploadUrl({ ...values, scope: budgetChangeRequestAttachmentScope(values.changeRequestId) });
  assertBudgetChangeRequestAttachmentKey(values.changeRequestId, upload.key);
  return { key: upload.key, uploadUrl: upload.uploadUrl };
}

export async function addBudgetChangeRequestAttachment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CREATE);
  const values = parseInput(addBudgetChangeRequestAttachmentSchema.safeParse(input));
  const context = await getBudgetChangeRequestContext(values.changeRequestId);
  if (context.request.status !== "DRAFT") throw new Error("Dokumen perubahan hanya dapat ditambahkan pada draf pengajuan.");
  assertBudgetChangeRequestAttachmentKey(values.changeRequestId, values.storageKey);
  await getObjectStorage().verifyObject(values.storageKey, { contentType: values.contentType, size: values.sizeBytes, originalName: values.storageKey.split("/").at(-1) ?? "perubahan.pdf" });
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().insert(budgetChangeRequestAttachment).values({ id, changeRequestId: values.changeRequestId, storageKey: values.storageKey, contentType: values.contentType, sizeBytes: values.sizeBytes, caption: optionalValue(values.caption), createdBy: session.user.id, createdAt: now });
  await getDb().insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BUDGET_CHANGE_REQUEST_ATTACHMENT", entityId: id, newValues: { changeRequestId: values.changeRequestId, contentType: values.contentType, sizeBytes: values.sizeBytes } }));
  return { id };
}

export async function getBudgetChangeRequestAttachmentDownloadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.BUDGET_READ);
  const values = parseInput(budgetChangeRequestAttachmentDownloadSchema.safeParse(input));
  const [attachment] = await getDb().select({ storageKey: budgetChangeRequestAttachment.storageKey }).from(budgetChangeRequestAttachment).where(and(eq(budgetChangeRequestAttachment.id, values.attachmentId), eq(budgetChangeRequestAttachment.changeRequestId, values.changeRequestId))).limit(1);
  if (!attachment) throw new Error("Dokumen perubahan tidak ditemukan.");
  assertBudgetChangeRequestAttachmentKey(values.changeRequestId, attachment.storageKey);
  return { downloadUrl: await getObjectStorage().createDownloadUrl(attachment.storageKey) };
}

async function transitionBudgetChangeRequest(id: string, status: "SUBMITTED" | "VERIFIED" | "APPROVED" | "REJECTED" | "CANCELLED", actorUserId: string, notes?: string) {
  const context = await getBudgetChangeRequestContext(id); const current = context.request.status; const now = new Date();
  const allowed: Record<string, string[]> = { DRAFT: ["SUBMITTED", "CANCELLED"], SUBMITTED: ["VERIFIED", "REJECTED"], VERIFIED: ["APPROVED", "REJECTED"] };
  if (!allowed[current]?.includes(status)) throw new Error(`Perubahan anggaran tidak dapat diubah dari ${current} menjadi ${status}.`);
  if (status === "SUBMITTED") {
    const [attachment] = await getDb().select({ id: budgetChangeRequestAttachment.id }).from(budgetChangeRequestAttachment).where(eq(budgetChangeRequestAttachment.changeRequestId, id)).limit(1);
    if (!attachment) throw new Error("Dokumen Perubahan wajib dilampirkan sebelum pengajuan.");
  }
  if (status === "APPROVED") await assertAllocationWithinFunds(context.period.id, context.request.proposedAmount, context.item.id);
  await getDb().transaction(async (tx) => {
    if (status === "APPROVED") {
      const [itemResult] = await tx.update(budgetItem).set({ allocatedAmount: context.request.proposedAmount, updatedAt: now }).where(and(eq(budgetItem.id, context.item.id), eq(budgetItem.allocatedAmount, context.request.previousAmount)));
      if (itemResult.affectedRows !== 1) throw new Error("Alokasi berubah sebelum persetujuan. Muat ulang lalu coba lagi.");
      await tx.insert(budgetRevision).values({ id: crypto.randomUUID(), budgetItemId: context.item.id, previousAmount: context.request.previousAmount, nextAmount: context.request.proposedAmount, reason: `Perubahan anggaran: ${context.request.reason}`, revisedBy: actorUserId, createdAt: now });
    }
    const update = status === "SUBMITTED" ? { status, submittedAt: now, updatedAt: now } : status === "VERIFIED" ? { status, verifiedAt: now, verifiedBy: actorUserId, updatedAt: now } : status === "APPROVED" ? { status, approvedAt: now, approvedBy: actorUserId, updatedAt: now } : { status, rejectionReason: optionalValue(notes), updatedAt: now };
    const [requestResult] = await tx.update(budgetChangeRequest).set(update).where(and(eq(budgetChangeRequest.id, id), eq(budgetChangeRequest.status, current)));
    if (requestResult.affectedRows !== 1) throw new Error("Pengajuan perubahan sudah berubah. Muat ulang lalu coba lagi.");
    await tx.insert(budgetPeriodHistory).values({ id: crypto.randomUUID(), periodId: context.period.id, budgetItemId: context.item.id, action: `CHANGE_${status}`, notes: optionalValue(notes), createdBy: actorUserId, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId, action: status === "APPROVED" ? AUDIT_ACTIONS.APPROVE : status === "VERIFIED" ? AUDIT_ACTIONS.VERIFY : status === "REJECTED" ? AUDIT_ACTIONS.REJECT : status === "SUBMITTED" ? AUDIT_ACTIONS.SUBMIT : AUDIT_ACTIONS.UPDATE, entityType: "BUDGET_CHANGE_REQUEST", entityId: id, oldValues: { status: current }, newValues: { status, notes: optionalValue(notes), proposedAmount: context.request.proposedAmount } }));
  });
  return { id, status };
}

export async function submitBudgetChangeRequest(input: unknown) { const session = await requirePermission(PERMISSIONS.BUDGET_CREATE); const values = parseInput(budgetChangeRequestTransitionSchema.pick({ id: true, notes: true }).safeParse(input)); return transitionBudgetChangeRequest(values.id, "SUBMITTED", session.user.id, values.notes ?? `Diajukan oleh ${session.user.name}`); }
export async function verifyBudgetChangeRequest(input: unknown) { const session = await requirePermission(PERMISSIONS.BUDGET_VERIFY); const values = parseInput(budgetChangeRequestTransitionSchema.pick({ id: true, notes: true }).safeParse(input)); return transitionBudgetChangeRequest(values.id, "VERIFIED", session.user.id, values.notes); }
export async function approveBudgetChangeRequest(input: unknown) { const session = await requirePermission(PERMISSIONS.BUDGET_APPROVE); const values = parseInput(budgetChangeRequestTransitionSchema.pick({ id: true, notes: true }).safeParse(input)); return transitionBudgetChangeRequest(values.id, "APPROVED", session.user.id, values.notes); }
export async function rejectBudgetChangeRequest(input: unknown) { const session = await requirePermission(PERMISSIONS.BUDGET_APPROVE); const values = parseInput(budgetChangeRequestTransitionSchema.pick({ id: true, notes: true }).safeParse(input)); return transitionBudgetChangeRequest(values.id, "REJECTED", session.user.id, values.notes); }
export async function cancelBudgetChangeRequest(input: unknown) { const session = await requirePermission(PERMISSIONS.BUDGET_CREATE); const values = parseInput(budgetChangeRequestTransitionSchema.pick({ id: true, notes: true }).safeParse(input)); return transitionBudgetChangeRequest(values.id, "CANCELLED", session.user.id, values.notes); }

export async function verifyBudgetPeriod(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_VERIFY);
  const values = parseInput(verifyBudgetPeriodSchema.safeParse(input));
  const period = await getBudgetPeriodOrThrow(values.id);
  assertPeriodStatus(period.status, "DRAFT");
  const snapshot = await getBudgetAllocationSnapshot(period.id);
  if (snapshot.unallocatedFunds < 0) throw new Error("Budget allocations exceed available funds.");
  const now = new Date();
  await getDb().transaction(async (tx) => {
    const [updateResult] = await tx.update(budgetPeriod).set({ status: "VERIFIED", approvalNotes: optionalValue(values.notes), updatedAt: now }).where(and(eq(budgetPeriod.id, period.id), eq(budgetPeriod.status, "DRAFT")));
    if (updateResult.affectedRows !== 1) throw new Error("This budget period was changed by another user. Refresh and try again.");
    await tx.insert(budgetPeriodHistory).values({ id: crypto.randomUUID(), periodId: period.id, budgetItemId: null, action: "VERIFIED", notes: optionalValue(values.notes), createdBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.VERIFY, entityType: "BUDGET_PERIOD", entityId: period.id, oldValues: { status: "DRAFT" }, newValues: { status: "VERIFIED", notes: optionalValue(values.notes) } }));
  });
  return { id: period.id, status: "VERIFIED" };
}

export async function approveBudgetPeriod(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_APPROVE); const values = parseInput(approveBudgetPeriodSchema.safeParse(input)); const database = getDb();
  const [period] = await database.select().from(budgetPeriod).where(eq(budgetPeriod.id, values.id)).limit(1); if (!period) throw new Error("Budget period was not found."); if (period.status !== "VERIFIED") throw new Error("Only verified budget periods can be approved.");
  const now = new Date();
  await database.transaction(async (tx) => {
    const [updateResult] = await tx.update(budgetPeriod).set({ status: "APPROVED", approvalNotes: optionalValue(values.approvalNotes), approvedBy: session.user.id, updatedAt: now }).where(and(eq(budgetPeriod.id, period.id), eq(budgetPeriod.status, "VERIFIED")));
    if (updateResult.affectedRows !== 1) throw new Error("This budget period was changed by another user. Refresh and try again.");
    await tx.insert(budgetPeriodHistory).values({ id: crypto.randomUUID(), periodId: period.id, budgetItemId: null, action: "APPROVED", notes: optionalValue(values.approvalNotes), createdBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.APPROVE, entityType: "BUDGET_PERIOD", entityId: period.id, oldValues: { status: "VERIFIED" }, newValues: { status: "APPROVED" } }));
  }); return { id: period.id, status: "APPROVED" };
}

export async function getRealizations(input?: unknown) {
  await requirePermission(PERMISSIONS.REALIZATION_READ);
  const values = realizationFiltersSchema.parse(input ?? {});
  const baseConditions = [
    values.budgetItemId ? eq(realizationRequest.budgetItemId, values.budgetItemId) : undefined,
    values.categoryId ? eq(budgetGroup.categoryId, values.categoryId) : undefined,
    values.periodKey ? eq(budgetPeriod.periodKey, values.periodKey) : undefined,
    values.dateFrom ? gte(realizationRequest.realizationDate, values.dateFrom) : undefined,
    values.dateTo ? lte(realizationRequest.realizationDate, values.dateTo) : undefined,
    values.query ? or(like(realizationRequest.description, `%${values.query}%`), like(realizationRequest.activity, `%${values.query}%`), like(realizationRequest.receiptNumber, `%${values.query}%`), like(budgetItem.name, `%${values.query}%`)) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const where = [...baseConditions, values.status ? eq(realizationRequest.status, values.status) : undefined].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const whereClause = where.length ? and(...where) : undefined;
  const baseWhere = baseConditions.length ? and(...baseConditions) : undefined;
  const database = getDb();
  const baseQuery = database.select({ realization: realizationRequest, budgetItemName: budgetItem.name, groupName: budgetGroup.name, categoryName: budgetCategory.name, periodKey: budgetPeriod.periodKey }).from(realizationRequest).innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).leftJoin(budgetCategory, eq(budgetCategory.id, budgetGroup.categoryId)).innerJoin(budgetPeriod, eq(budgetPeriod.id, budgetGroup.periodId));
  const [items, [{ total }], statusCounts] = await Promise.all([
    baseQuery.where(whereClause).orderBy(desc(realizationRequest.createdAt)).limit(values.pageSize).offset((values.page - 1) * values.pageSize),
    database.select({ total: count() }).from(realizationRequest).innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).leftJoin(budgetCategory, eq(budgetCategory.id, budgetGroup.categoryId)).innerJoin(budgetPeriod, eq(budgetPeriod.id, budgetGroup.periodId)).where(whereClause),
    database.select({ status: realizationRequest.status, total: count() }).from(realizationRequest).innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).leftJoin(budgetCategory, eq(budgetCategory.id, budgetGroup.categoryId)).innerJoin(budgetPeriod, eq(budgetPeriod.id, budgetGroup.periodId)).where(baseWhere).groupBy(realizationRequest.status),
  ]);
  return { items, page: values.page, pageSize: values.pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / values.pageSize), statusCounts: Object.fromEntries(statusCounts.map((item) => [item.status, Number(item.total)])) };
}

export async function getRealizationDetail(id: string) {
  await requirePermission(PERMISSIONS.REALIZATION_READ);
  const validId = z.string().uuid("Invalid realization ID.").parse(id);
  const [realization] = await getDb().select().from(realizationRequest).where(eq(realizationRequest.id, validId)).limit(1);
  if (!realization) throw new Error("Realization was not found.");
  const budgetItemRecord = await getBudgetItemOrThrow(realization.budgetItemId);
  const [group] = await getDb().select().from(budgetGroup).where(eq(budgetGroup.id, budgetItemRecord.groupId)).limit(1);
  if (!group) throw new Error("Budget group was not found.");
  const [period] = await getDb().select().from(budgetPeriod).where(eq(budgetPeriod.id, group.periodId)).limit(1);
  if (!period) throw new Error("Budget period was not found.");
  const [category] = await getDb().select().from(budgetCategory).where(eq(budgetCategory.id, group.categoryId ?? "")).limit(1);
  const item = { realization, budgetItem: budgetItemRecord, group, period, category: category ?? null };
  const [approvals, transactions, evidence, linkedFundRequest] = await Promise.all([
    getDb().select().from(realizationApproval).where(eq(realizationApproval.realizationId, validId)).orderBy(desc(realizationApproval.createdAt)),
    getDb().select().from(financialTransaction).where(and(eq(financialTransaction.relatedEntityType, "REALIZATION"), eq(financialTransaction.relatedEntityId, validId))).orderBy(desc(financialTransaction.createdAt)),
    getDb().select().from(realizationEvidence).where(eq(realizationEvidence.realizationId, validId)).orderBy(desc(realizationEvidence.createdAt)),
    realization.fundRequestId ? getDb().select({ id: fundRequest.id, requestNumber: fundRequest.requestNumber, status: fundRequest.status, title: fundRequest.title }).from(fundRequest).where(eq(fundRequest.id, realization.fundRequestId)).limit(1).then((rows) => rows[0] ?? null) : Promise.resolve(null),
  ]);
  return { ...item, approvals, transactions, evidence, linkedFundRequest, calculation: await getRealizationCalculationSnapshot(realization.budgetItemId, realization.status === "SAH" ? realization.id : undefined) };
}

export async function createRealization(input: unknown) {
  const session = await requirePermission(PERMISSIONS.REALIZATION_CREATE); const values = parseInput(createRealizationSchema.safeParse(input)); const database = getDb();
  const { item } = await getRealizationContext(values.budgetItemId, values.fundRequestId);
  const calculation = await assertRealizationAmountAvailable(item.id, values.requestedAmount); const id = crypto.randomUUID(); const now = new Date();
  await database.transaction(async (tx) => {
    await tx.insert(realizationRequest).values({ id, budgetItemId: item.id, fundRequestId: values.fundRequestId ?? null, activity: values.activity, realizationDate: values.realizationDate, receiptNumber: optionalValue(values.receiptNumber), requestedAmount: values.requestedAmount, description: values.description, evidenceKey: optionalValue(values.evidenceKey), calculationSnapshot: calculationSnapshotValues(calculation), correctsRealizationId: null, correctionReason: null, status: "DRAFT", isOverAllocation: 0, createdBy: session.user.id, verifiedBy: null, approvedBy: null, submittedAt: null, verifiedAt: null, approvedAt: null, reversedAt: null, reversedBy: null, reversalReason: null, reversalTransactionId: null, createdAt: now, updatedAt: now });
    await tx.insert(realizationApproval).values({ id: crypto.randomUUID(), realizationId: id, action: "CREATE", notes: null, actorUserId: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "REALIZATION", entityId: id, newValues: { budgetItemId: item.id, fundRequestId: values.fundRequestId ?? null, activity: values.activity, realizationDate: values.realizationDate, requestedAmount: values.requestedAmount, calculation: calculationSnapshotValues(calculation) } }));
  });
  return { id, status: "DRAFT" };
}

export async function updateRealization(input: unknown) {
  const session = await requirePermission(PERMISSIONS.REALIZATION_CREATE); const values = parseInput(updateRealizationSchema.safeParse(input)); const current = await assertEditableRealization(values.id, session.user.id);
  const { item } = await getRealizationContext(values.budgetItemId, values.fundRequestId);
  const calculation = await assertRealizationAmountAvailable(item.id, values.requestedAmount, current.budgetItemId === item.id ? current.id : undefined); const now = new Date();
  await getDb().transaction(async (tx) => {
    const [result] = await tx.update(realizationRequest).set({ budgetItemId: item.id, fundRequestId: values.fundRequestId ?? null, activity: values.activity, realizationDate: values.realizationDate, receiptNumber: optionalValue(values.receiptNumber), requestedAmount: values.requestedAmount, description: values.description, evidenceKey: optionalValue(values.evidenceKey), calculationSnapshot: calculationSnapshotValues(calculation), status: "DRAFT", updatedAt: now }).where(and(eq(realizationRequest.id, current.id), eq(realizationRequest.status, current.status)));
    if (result.affectedRows !== 1) throw new Error("This realization was changed by another user. Refresh and try again.");
    await tx.insert(realizationApproval).values({ id: crypto.randomUUID(), realizationId: current.id, action: current.status === "REVISION_REQUIRED" ? "REVISED" : "UPDATED", notes: null, actorUserId: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "REALIZATION", entityId: current.id, oldValues: { status: current.status, requestedAmount: current.requestedAmount }, newValues: { status: "DRAFT", requestedAmount: values.requestedAmount, calculation: calculationSnapshotValues(calculation) } }));
  });
  return { id: current.id, status: "DRAFT" };
}

export async function transitionRealization(input: unknown) {
  const values = parseInput(transitionRealizationSchema.safeParse(input));
  const database = getDb();
  const [current] = await database.select().from(realizationRequest).where(eq(realizationRequest.id, values.id)).limit(1);
  if (!current) throw new Error("Realization was not found.");
  const allowedTransitions: readonly string[] = REALIZATION_TRANSITIONS[current.status as keyof typeof REALIZATION_TRANSITIONS] ?? [];
  if (!allowedTransitions.includes(values.status)) throw new Error(`Cannot change realization from ${current.status} to ${values.status}.`);
  if (["REVISION_REQUIRED", "REJECTED", "CANCELLED"].includes(values.status) && !values.notes?.trim()) throw new Error("A reason is required for this decision.");
  const required = values.status === "SUBMITTED" || values.status === "CANCELLED"
    ? PERMISSIONS.REALIZATION_CREATE
    : values.status === "VERIFIED" || (values.status !== "SAH" && current.status === "SUBMITTED")
      ? PERMISSIONS.REALIZATION_VERIFY
      : PERMISSIONS.REALIZATION_APPROVE;
  const session = await requirePermission(required);
  if (["SUBMITTED", "CANCELLED"].includes(values.status) && current.createdBy !== session.user.id) throw new Error("Only the realization creator can submit or cancel this record.");
  if (["VERIFIED", "REVISION_REQUIRED", "REJECTED", "SAH"].includes(values.status) && current.createdBy === session.user.id) throw new Error("A realization cannot be reviewed or approved by its creator.");
  if (values.status === "SUBMITTED") await assertRealizationAmountAvailable(current.budgetItemId, current.requestedAmount, current.correctsRealizationId ?? current.id);
  const now = new Date();
  await database.transaction(async (tx) => {
    const approvalSnapshot = values.status === "SAH" ? calculationSnapshotValues(await getRealizationCalculationSnapshot(current.budgetItemId)) : current.calculationSnapshot;
    const [updateResult] = await tx.update(realizationRequest).set({ status: values.status, calculationSnapshot: approvalSnapshot, submittedAt: values.status === "SUBMITTED" ? now : current.submittedAt, verifiedAt: values.status === "VERIFIED" ? now : current.verifiedAt, approvedAt: values.status === "SAH" ? now : current.approvedAt, verifiedBy: values.status === "VERIFIED" ? session.user.id : current.verifiedBy, approvedBy: values.status === "SAH" ? session.user.id : current.approvedBy, updatedAt: now }).where(and(eq(realizationRequest.id, current.id), eq(realizationRequest.status, current.status)));
    if (updateResult.affectedRows !== 1) throw new Error("This realization was changed by another user. Refresh and try again.");
    await tx.insert(realizationApproval).values({ id: crypto.randomUUID(), realizationId: current.id, action: values.status, notes: optionalValue(values.notes), actorUserId: session.user.id, createdAt: now });
    if (values.status === "SAH") {
      const [existingTransaction] = await tx.select().from(financialTransaction).where(and(eq(financialTransaction.relatedEntityType, "REALIZATION"), eq(financialTransaction.relatedEntityId, current.id), eq(financialTransaction.status, "SAH"))).limit(1);
      if (existingTransaction) throw new Error("This realization already has an approved cash transaction.");
      if (current.correctsRealizationId) {
        const [original] = await tx.select().from(realizationRequest).where(eq(realizationRequest.id, current.correctsRealizationId)).limit(1);
        if (!original || original.status !== "SAH") throw new Error("The original realization correction target is invalid.");
        const [originalTransaction] = await tx.select().from(financialTransaction).where(and(eq(financialTransaction.relatedEntityType, "REALIZATION"), eq(financialTransaction.relatedEntityId, original.id), eq(financialTransaction.status, "SAH"))).limit(1);
        if (!originalTransaction) throw new Error("The original realization cash transaction was not found.");
        await reverseFinancialTransactionRecord(tx, originalTransaction, session.user.id, `Correction for realization ${current.id}`);
        await tx.update(realizationRequest).set({ status: "REVERSED", reversedAt: now, reversedBy: session.user.id, reversalReason: `Replaced by correction ${current.id}`, updatedAt: now }).where(and(eq(realizationRequest.id, original.id), eq(realizationRequest.status, "SAH")));
        await tx.insert(realizationApproval).values({ id: crypto.randomUUID(), realizationId: original.id, action: "REVERSE", notes: `Replaced by correction ${current.id}`, actorUserId: session.user.id, createdAt: now });
      }
      await tx.insert(financialTransaction).values({ id: crypto.randomUUID(), transactionCode: financeCode(), transactionAt: now, transactionType: "CASH_OUT", amount: current.requestedAmount, description: current.description, relatedEntityType: "REALIZATION", relatedEntityId: current.id, evidenceKey: current.evidenceKey, status: "DRAFT", createdBy: session.user.id, approvedBy: null, reversedTransactionId: null, createdAt: now, updatedAt: now });
    }
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: values.status === "SAH" ? AUDIT_ACTIONS.APPROVE : values.status === "VERIFIED" ? AUDIT_ACTIONS.VERIFY : values.status === "REJECTED" ? AUDIT_ACTIONS.REJECT : AUDIT_ACTIONS.SUBMIT, entityType: "REALIZATION", entityId: current.id, oldValues: { status: current.status }, newValues: { status: values.status, notes: optionalValue(values.notes), isOverAllocation: current.isOverAllocation === 1 } }));
  });
  if (values.status === "SUBMITTED") await notifyPermissionHolders({ permission: PERMISSIONS.REALIZATION_VERIFY, ruleKey: "REALIZATION_SUBMITTED", targetKey: current.id, type: "REALIZATION_SUBMITTED", title: "Realization waiting for verification", body: "A realization request was submitted for verification.", relatedEntityType: "REALIZATION", relatedEntityId: current.id });
  if (values.status === "VERIFIED" || values.status === "SAH") await notifyPermissionHolders({ permission: values.status === "VERIFIED" ? PERMISSIONS.REALIZATION_APPROVE : PERMISSIONS.REALIZATION_READ, ruleKey: `REALIZATION_${values.status}`, targetKey: current.id, type: `REALIZATION_${values.status}`, title: values.status === "VERIFIED" ? "Realization verified" : "Realization approved", body: "A realization request changed status and is ready for review.", relatedEntityType: "REALIZATION", relatedEntityId: current.id });
  if (["SAH", "REVISION_REQUIRED", "REJECTED"].includes(values.status)) await createSystemNotificationOnce({ recipientUserId: current.createdBy, ruleKey: `REALIZATION_${values.status}`, targetKey: current.id, type: `REALIZATION_${values.status}`, title: `Realization ${values.status.toLowerCase().replaceAll("_", " ")}`, body: `Your realization ${current.id} changed to ${values.status}.`, relatedEntityType: "REALIZATION", relatedEntityId: current.id });
  return { id: current.id, status: values.status };
}

export async function correctRealization(input: unknown) {
  const session = await requirePermission(PERMISSIONS.REALIZATION_CREATE);
  const values = parseInput(correctRealizationSchema.safeParse(input));
  const database = getDb();
  const [original] = await database.select().from(realizationRequest).where(eq(realizationRequest.id, values.id)).limit(1);
  if (!original) throw new Error("Realization was not found.");
  if (original.createdBy !== session.user.id) throw new Error("Only the realization creator can create a correction.");
  if (original.status !== "SAH") throw new Error("Only SAH realizations can be corrected.");
  if (original.budgetItemId !== values.budgetItemId) throw new Error("A correction must remain linked to the original budget item.");
  const [existingCorrection] = await database.select({ id: realizationRequest.id }).from(realizationRequest).where(eq(realizationRequest.correctsRealizationId, original.id)).limit(1);
  if (existingCorrection) throw new Error("This realization already has a correction request.");
  const [originalTransaction] = await database.select({ id: financialTransaction.id }).from(financialTransaction).where(and(eq(financialTransaction.relatedEntityType, "REALIZATION"), eq(financialTransaction.relatedEntityId, original.id), eq(financialTransaction.status, "SAH"))).limit(1);
  if (!originalTransaction) throw new Error("The original realization cash transaction was not found.");
  const { item } = await getRealizationContext(values.budgetItemId, values.fundRequestId);
  const calculation = await assertRealizationAmountAvailable(item.id, values.requestedAmount, original.id);
  const id = crypto.randomUUID();
  const now = new Date();
  await database.transaction(async (tx) => {
    await tx.insert(realizationRequest).values({ id, budgetItemId: item.id, fundRequestId: values.fundRequestId ?? null, activity: values.activity, realizationDate: values.realizationDate, receiptNumber: optionalValue(values.receiptNumber), requestedAmount: values.requestedAmount, description: values.description, evidenceKey: optionalValue(values.evidenceKey), calculationSnapshot: calculationSnapshotValues(calculation), correctsRealizationId: original.id, correctionReason: values.reason, status: "DRAFT", isOverAllocation: 0, createdBy: session.user.id, verifiedBy: null, approvedBy: null, submittedAt: null, verifiedAt: null, approvedAt: null, reversedAt: null, reversedBy: null, reversalReason: null, reversalTransactionId: null, createdAt: now, updatedAt: now });
    await tx.insert(realizationApproval).values({ id: crypto.randomUUID(), realizationId: id, action: "CORRECT", notes: values.reason, actorUserId: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CORRECT, entityType: "REALIZATION", entityId: original.id, oldValues: { status: "SAH" }, newValues: { correctionId: id, requestedAmount: values.requestedAmount, calculation: calculationSnapshotValues(calculation) } }));
  });
  return { id, correctsRealizationId: original.id, status: "DRAFT" };
}

export async function reverseRealization(input: unknown) {
  const session = await requirePermission(PERMISSIONS.REALIZATION_APPROVE);
  const values = parseInput(reverseRealizationSchema.safeParse(input));
  const database = getDb();
  const [current] = await database.select().from(realizationRequest).where(eq(realizationRequest.id, values.id)).limit(1);
  if (!current) throw new Error("Realization was not found.");
  if (current.status !== "SAH") throw new Error("Only SAH realizations can be reversed.");
  const [currentTransaction] = await database.select().from(financialTransaction).where(and(eq(financialTransaction.relatedEntityType, "REALIZATION"), eq(financialTransaction.relatedEntityId, current.id), eq(financialTransaction.status, "SAH"))).limit(1);
  if (!currentTransaction) throw new Error("The realization cash transaction was not found.");
  const now = new Date();
  let reversalId = "";
  await database.transaction(async (tx) => {
    reversalId = await reverseFinancialTransactionRecord(tx, currentTransaction, session.user.id, values.reason);
    const [updateResult] = await tx.update(realizationRequest).set({ status: "REVERSED", reversedAt: now, reversedBy: session.user.id, reversalReason: values.reason, reversalTransactionId: reversalId, updatedAt: now }).where(and(eq(realizationRequest.id, current.id), eq(realizationRequest.status, "SAH")));
    if (updateResult.affectedRows !== 1) throw new Error("This realization was already changed. Refresh and try again.");
    await tx.insert(realizationApproval).values({ id: crypto.randomUUID(), realizationId: current.id, action: "REVERSE", notes: values.reason, actorUserId: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.REVERSE, entityType: "REALIZATION", entityId: current.id, oldValues: { status: "SAH" }, newValues: { financialReversalId: reversalId, reason: values.reason } }));
  });
  await createSystemNotificationOnce({ recipientUserId: current.createdBy, ruleKey: "REALIZATION_REVERSED", targetKey: current.id, type: "REALIZATION_REVERSED", title: "Realization reversed", body: `Your realization ${current.id} was reversed.`, relatedEntityType: "REALIZATION", relatedEntityId: current.id });
  return { id: current.id, reversalId };
}

export async function createRealizationEvidenceUploadUrl(input: unknown) {
  const session = await requirePermission(PERMISSIONS.REALIZATION_CREATE);
  const values = parseInput(realizationEvidenceUploadSchema.safeParse(input));
  await assertEditableRealization(values.realizationId, session.user.id);
  validateUpload(values);
  const upload = await getObjectStorage().createUploadUrl({ ...values, scope: realizationEvidenceScope(values.realizationId) });
  assertRealizationEvidenceKey(values.realizationId, upload.key);
  return { key: upload.key, uploadUrl: upload.uploadUrl };
}

export async function addRealizationEvidence(input: unknown) {
  const session = await requirePermission(PERMISSIONS.REALIZATION_CREATE);
  const values = parseInput(addRealizationEvidenceSchema.safeParse(input));
  const realization = await assertEditableRealization(values.realizationId, session.user.id);
  assertRealizationEvidenceKey(realization.id, values.storageKey);
  await getObjectStorage().verifyObject(values.storageKey, { contentType: values.contentType, size: values.sizeBytes, originalName: values.storageKey.split("/").at(-1) ?? "attachment" });
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(realizationEvidence).values({ id, realizationId: realization.id, storageKey: values.storageKey, contentType: values.contentType, sizeBytes: values.sizeBytes, caption: optionalValue(values.caption), createdBy: session.user.id, createdAt: now });
    await tx.insert(realizationApproval).values({ id: crypto.randomUUID(), realizationId: realization.id, action: "EVIDENCE_ADDED", notes: optionalValue(values.caption), actorUserId: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "REALIZATION_EVIDENCE", entityId: id, newValues: { realizationId: realization.id, storageKey: values.storageKey } }));
  });
  return { id };
}

export async function getRealizationEvidenceDownloadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.REALIZATION_READ);
  const values = parseInput(realizationEvidenceDownloadSchema.safeParse(input));
  const [evidence] = await getDb().select({ storageKey: realizationEvidence.storageKey }).from(realizationEvidence).where(and(eq(realizationEvidence.id, values.evidenceId), eq(realizationEvidence.realizationId, values.realizationId))).limit(1);
  if (!evidence) throw new Error("Realization evidence was not found.");
  assertRealizationEvidenceKey(values.realizationId, evidence.storageKey);
  return { downloadUrl: await getObjectStorage().createDownloadUrl(evidence.storageKey) };
}
