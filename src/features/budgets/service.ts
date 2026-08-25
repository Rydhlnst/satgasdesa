import { and, count, desc, eq, gte, inArray, like, lte, ne, or } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { budgetCategory, budgetGroup, budgetItem, budgetItemAttachment, budgetPeriod, budgetPeriodHistory, budgetRevision, budgetSubcategory, realizationRequest } from "@/src/db/schema/budgets";
import { financialTransaction } from "@/src/db/schema/finance";
import { fundRequest } from "@/src/db/schema/fund-requests";
import { realizationApproval, realizationEvidence } from "@/src/db/schema/history-evidence";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getObjectStorage, validateUpload } from "@/src/lib/storage";
import { createSystemNotificationOnce, notifyPermissionHolders } from "@/src/features/notifications/service";
import { reverseFinancialTransactionRecord } from "@/src/features/finance/service";

import { assertRealizationAmountAvailable as assertRemainingAllocation } from "./allocation-rules";
import { BUDGET_PERIOD_STATUSES, INITIAL_BUDGET_GROUPS, REALIZATION_TRANSITIONS } from "./constants";
import { addBudgetCategoryToPeriodSchema, addBudgetItemAttachmentSchema, addRealizationEvidenceSchema, approveBudgetPeriodSchema, budgetCategoryFiltersSchema, budgetItemAttachmentDownloadSchema, budgetItemAttachmentUploadSchema, budgetPeriodFiltersSchema, correctRealizationSchema, createBudgetCategorySchema, createBudgetItemSchema, createBudgetPeriodSchema, createBudgetSubcategorySchema, createRealizationSchema, deleteBudgetItemSchema, realizationEvidenceDownloadSchema, realizationEvidenceUploadSchema, realizationFiltersSchema, reverseRealizationSchema, reviseBudgetItemSchema, transitionRealizationSchema, updateBudgetCategorySchema, updateBudgetItemSchema, updateBudgetSubcategorySchema, updateRealizationSchema, verifyBudgetPeriodSchema } from "./schema";

function parseInput<T>(result: { success: boolean; data?: T }): T {
  if (!result.success || !result.data) throw new Error("Please check the budget details and try again.");
  return result.data;
}

function optionalValue(value?: string): string | null { return value?.trim() ? value.trim() : null; }
function financeCode(): string { return `TX-REAL-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`; }
function budgetItemAttachmentScope(budgetItemId: string): string { return `budget-items/${budgetItemId}`; }
function assertBudgetItemAttachmentKey(budgetItemId: string, storageKey: string): void {
  const scope = `${budgetItemAttachmentScope(budgetItemId)}/`;
  if (!storageKey.startsWith(scope) || storageKey.slice(scope.length).includes("/") || storageKey.includes("..") || storageKey.includes("\\")) throw new Error("Budget attachment is outside the permitted storage scope.");
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
  const [item] = await getDb().select().from(budgetItem).where(eq(budgetItem.id, itemId)).limit(1);
  if (!item) throw new Error("Budget item was not found.");
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
  const [item] = await getDb().select().from(budgetItem).where(eq(budgetItem.id, budgetItemId)).limit(1);
  if (!item) throw new Error("Budget item was not found.");
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
  const [item] = await database.select().from(budgetItem).where(eq(budgetItem.id, budgetItemId)).limit(1);
  if (!item) throw new Error("Budget item was not found.");
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

export async function getBudgetPeriodDetail(periodId: string) {
  await requirePermission(PERMISSIONS.BUDGET_READ);
  const validId = z.string().uuid("Invalid budget period ID.").parse(periodId);
  const period = await getBudgetPeriodOrThrow(validId);
  const [groups, items, revisions, realizations, attachments, history] = await Promise.all([
    getDb().select().from(budgetGroup).where(eq(budgetGroup.periodId, validId)).orderBy(budgetGroup.sortOrder),
    getDb().select({ item: budgetItem, groupId: budgetGroup.id, groupName: budgetGroup.name, subcategoryName: budgetSubcategory.name }).from(budgetItem).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).leftJoin(budgetSubcategory, eq(budgetSubcategory.id, budgetItem.subcategoryId)).where(eq(budgetGroup.periodId, validId)).orderBy(budgetGroup.sortOrder, budgetItem.name),
    getDb().select({ revision: budgetRevision, itemName: budgetItem.name }).from(budgetRevision).innerJoin(budgetItem, eq(budgetItem.id, budgetRevision.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(eq(budgetGroup.periodId, validId)).orderBy(desc(budgetRevision.createdAt)),
    getDb().select({ budgetItemId: realizationRequest.budgetItemId, requestedAmount: realizationRequest.requestedAmount, status: realizationRequest.status }).from(realizationRequest).innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(eq(budgetGroup.periodId, validId)),
    getDb().select({ attachment: budgetItemAttachment }).from(budgetItemAttachment).innerJoin(budgetItem, eq(budgetItem.id, budgetItemAttachment.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(eq(budgetGroup.periodId, validId)).orderBy(desc(budgetItemAttachment.createdAt)),
    getDb().select().from(budgetPeriodHistory).where(eq(budgetPeriodHistory.periodId, validId)).orderBy(desc(budgetPeriodHistory.createdAt)),
  ]);
  const snapshot = await getBudgetAllocationSnapshot(validId);
  return {
    period,
    groups: groups.map((group) => ({ ...group, items: items.filter((entry) => entry.groupId === group.id).map((entry) => ({ ...entry.item, subcategoryName: entry.subcategoryName, attachments: attachments.filter((attachment) => attachment.attachment.budgetItemId === entry.item.id).map((attachment) => attachment.attachment), approvedRealization: realizations.filter((realization) => realization.budgetItemId === entry.item.id && realization.status === "SAH").reduce((total, realization) => total + realization.requestedAmount, 0), pendingRealization: realizations.filter((realization) => realization.budgetItemId === entry.item.id && ["SUBMITTED", "VERIFIED"].includes(realization.status)).reduce((total, realization) => total + realization.requestedAmount, 0) })) })),
    revisions,
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
  const [item] = await getDb().select().from(budgetItem).where(eq(budgetItem.id, values.id)).limit(1); if (!item) throw new Error("Budget item was not found."); const group = await getDraftGroup(item.groupId); await assertAllocationWithinFunds(group.periodId, values.allocatedAmount, item.id);
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
  const [item] = await getDb().select().from(budgetItem).where(eq(budgetItem.id, values.id)).limit(1);
  if (!item) throw new Error("Budget item was not found.");
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
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.APPROVE, entityType: "BUDGET_PERIOD", entityId: period.id, oldValues: { status: "DRAFT" }, newValues: { status: "APPROVED" } }));
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
  const [item] = await getDb().select({ realization: realizationRequest, budgetItem: budgetItem, group: budgetGroup, period: budgetPeriod, category: budgetCategory }).from(realizationRequest).innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).leftJoin(budgetCategory, eq(budgetCategory.id, budgetGroup.categoryId)).innerJoin(budgetPeriod, eq(budgetPeriod.id, budgetGroup.periodId)).where(eq(realizationRequest.id, validId)).limit(1);
  if (!item) throw new Error("Realization was not found.");
  const [approvals, transactions, evidence, linkedFundRequest] = await Promise.all([
    getDb().select().from(realizationApproval).where(eq(realizationApproval.realizationId, validId)).orderBy(desc(realizationApproval.createdAt)),
    getDb().select().from(financialTransaction).where(and(eq(financialTransaction.relatedEntityType, "REALIZATION"), eq(financialTransaction.relatedEntityId, validId))).orderBy(desc(financialTransaction.createdAt)),
    getDb().select().from(realizationEvidence).where(eq(realizationEvidence.realizationId, validId)).orderBy(desc(realizationEvidence.createdAt)),
    item.realization.fundRequestId ? getDb().select({ id: fundRequest.id, requestNumber: fundRequest.requestNumber, status: fundRequest.status, title: fundRequest.title }).from(fundRequest).where(eq(fundRequest.id, item.realization.fundRequestId)).limit(1).then((rows) => rows[0] ?? null) : Promise.resolve(null),
  ]);
  return { ...item, approvals, transactions, evidence, linkedFundRequest, calculation: await getRealizationCalculationSnapshot(item.realization.budgetItemId, item.realization.status === "SAH" ? item.realization.id : undefined) };
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
      await tx.insert(financialTransaction).values({ id: crypto.randomUUID(), transactionCode: financeCode(), transactionAt: now, transactionType: "CASH_OUT", amount: current.requestedAmount, description: current.description, relatedEntityType: "REALIZATION", relatedEntityId: current.id, evidenceKey: current.evidenceKey, status: "SAH", createdBy: session.user.id, approvedBy: session.user.id, reversedTransactionId: null, createdAt: now, updatedAt: now });
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
