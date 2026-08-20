import { and, count, desc, eq, inArray, like, ne, or } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { budgetGroup, budgetItem, budgetPeriod, budgetRevision, realizationRequest } from "@/src/db/schema/budgets";
import { financialTransaction } from "@/src/db/schema/finance";
import { realizationApproval } from "@/src/db/schema/history-evidence";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { notifyPermissionHolders } from "@/src/features/notifications/service";
import { reverseFinancialTransactionRecord } from "@/src/features/finance/service";

import { BUDGET_PERIOD_STATUSES, INITIAL_BUDGET_GROUPS, REALIZATION_TRANSITIONS } from "./constants";
import { approveBudgetPeriodSchema, budgetPeriodFiltersSchema, correctRealizationSchema, createBudgetItemSchema, createBudgetPeriodSchema, createRealizationSchema, realizationFiltersSchema, reverseRealizationSchema, reviseBudgetItemSchema, transitionRealizationSchema, updateBudgetItemSchema, verifyBudgetPeriodSchema } from "./schema";

function parseInput<T>(result: { success: boolean; data?: T }): T {
  if (!result.success || !result.data) throw new Error("Please check the budget details and try again.");
  return result.data;
}

function optionalValue(value?: string): string | null { return value?.trim() ? value.trim() : null; }
function financeCode(): string { return `TX-REAL-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`; }

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

async function getRealizationCalculationSnapshot(budgetItemId: string, excludeRealizationId?: string) {
  const [item] = await getDb().select().from(budgetItem).where(eq(budgetItem.id, budgetItemId)).limit(1);
  if (!item) throw new Error("Budget item was not found.");
  const rows = await getDb().select({ id: realizationRequest.id, requestedAmount: realizationRequest.requestedAmount, status: realizationRequest.status, isOverAllocation: realizationRequest.isOverAllocation }).from(realizationRequest).where(and(eq(realizationRequest.budgetItemId, budgetItemId), inArray(realizationRequest.status, ["SUBMITTED", "VERIFIED", "SAH"]), excludeRealizationId ? ne(realizationRequest.id, excludeRealizationId) : undefined));
  const approvedRealization = rows.filter((row) => row.status === "SAH").reduce((total, row) => total + row.requestedAmount, 0);
  const pendingRealization = rows.filter((row) => row.status === "SUBMITTED" || row.status === "VERIFIED").reduce((total, row) => total + row.requestedAmount, 0);
  const committedRealization = approvedRealization + pendingRealization;
  return { item, allocation: item.allocatedAmount, approvedRealization, pendingRealization, committedRealization, remainingAllocation: item.allocatedAmount - committedRealization, overAllocationAmount: Math.max(0, committedRealization - item.allocatedAmount), overAllocatedRequests: rows.filter((row) => row.isOverAllocation === 1).length };
}

export async function getBudgetPeriods(input?: unknown) {
  await requirePermission(PERMISSIONS.BUDGET_READ);
  const values = budgetPeriodFiltersSchema.parse(input ?? {});
  const conditions = [
    values.status ? eq(budgetPeriod.status, values.status) : undefined,
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
  const [groups, items, revisions] = await Promise.all([
    getDb().select().from(budgetGroup).where(eq(budgetGroup.periodId, validId)).orderBy(budgetGroup.sortOrder),
    getDb().select({ item: budgetItem, groupId: budgetGroup.id, groupName: budgetGroup.name }).from(budgetItem).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(eq(budgetGroup.periodId, validId)).orderBy(budgetGroup.sortOrder, budgetItem.name),
    getDb().select({ revision: budgetRevision, itemName: budgetItem.name }).from(budgetRevision).innerJoin(budgetItem, eq(budgetItem.id, budgetRevision.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).where(eq(budgetGroup.periodId, validId)).orderBy(desc(budgetRevision.createdAt)),
  ]);
  const snapshot = await getBudgetAllocationSnapshot(validId);
  return {
    period,
    groups: groups.map((group) => ({ ...group, items: items.filter((entry) => entry.groupId === group.id).map((entry) => entry.item) })),
    revisions,
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
  const id = crypto.randomUUID(); const now = new Date();
  await database.transaction(async (tx) => {
    await tx.insert(budgetPeriod).values({ id, ...values, status: "DRAFT", approvalNotes: null, createdBy: session.user.id, approvedBy: null, createdAt: now, updatedAt: now });
    await tx.insert(budgetGroup).values(INITIAL_BUDGET_GROUPS.map((name, sortOrder) => ({ id: crypto.randomUUID(), periodId: id, name, sortOrder, createdAt: now })));
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BUDGET_PERIOD", entityId: id, newValues: { periodKey: values.periodKey } }));
  });
  return { id };
}

export async function createBudgetItem(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CREATE); const values = parseInput(createBudgetItemSchema.safeParse(input));
  const group = await getDraftGroup(values.groupId);
  await assertAllocationWithinFunds(group.periodId, values.allocatedAmount);
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(budgetItem).values({ id, ...values, notes: optionalValue(values.notes), createdAt: now, updatedAt: now });
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
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "BUDGET_ITEM", entityId: item.id, oldValues: { allocatedAmount: item.allocatedAmount }, newValues: { allocatedAmount: values.allocatedAmount } }));
  }); return { id: item.id };
}

export async function updateBudgetItem(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_CREATE);
  const values = parseInput(updateBudgetItemSchema.safeParse(input));
  const [item] = await getDb().select().from(budgetItem).where(eq(budgetItem.id, values.id)).limit(1);
  if (!item) throw new Error("Budget item was not found.");
  const group = await getDraftGroup(item.groupId);
  await assertAllocationWithinFunds(group.periodId, values.allocatedAmount, item.id);
  const now = new Date();
  await getDb().transaction(async (tx) => {
    const [updateResult] = await tx.update(budgetItem).set({ name: values.name, allocatedAmount: values.allocatedAmount, notes: optionalValue(values.notes), updatedAt: now }).where(and(eq(budgetItem.id, item.id), eq(budgetItem.updatedAt, item.updatedAt)));
    if (updateResult.affectedRows !== 1) throw new Error("This budget item was changed by another user. Refresh and try again.");
    await tx.insert(budgetRevision).values({ id: crypto.randomUUID(), budgetItemId: item.id, previousAmount: item.allocatedAmount, nextAmount: values.allocatedAmount, reason: "Draft allocation update", revisedBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "BUDGET_ITEM", entityId: item.id, oldValues: { name: item.name, allocatedAmount: item.allocatedAmount, notes: item.notes }, newValues: { name: values.name, allocatedAmount: values.allocatedAmount, notes: optionalValue(values.notes) } }));
  });
  return { id: item.id };
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
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.VERIFY, entityType: "BUDGET_PERIOD", entityId: period.id, oldValues: { status: "DRAFT" }, newValues: { status: "VERIFIED", notes: optionalValue(values.notes) } }));
  });
  return { id: period.id, status: "VERIFIED" };
}

export async function approveBudgetPeriod(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUDGET_APPROVE); const values = parseInput(approveBudgetPeriodSchema.safeParse(input)); const database = getDb();
  const [period] = await database.select().from(budgetPeriod).where(eq(budgetPeriod.id, values.id)).limit(1); if (!period) throw new Error("Budget period was not found."); if (period.status !== "VERIFIED") throw new Error("Only verified budget periods can be approved.");
  await database.transaction(async (tx) => {
    const [updateResult] = await tx.update(budgetPeriod).set({ status: "APPROVED", approvalNotes: optionalValue(values.approvalNotes), approvedBy: session.user.id, updatedAt: new Date() }).where(and(eq(budgetPeriod.id, period.id), eq(budgetPeriod.status, "VERIFIED")));
    if (updateResult.affectedRows !== 1) throw new Error("This budget period was changed by another user. Refresh and try again.");
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.APPROVE, entityType: "BUDGET_PERIOD", entityId: period.id, oldValues: { status: "DRAFT" }, newValues: { status: "APPROVED" } }));
  }); return { id: period.id, status: "APPROVED" };
}

export async function getRealizations(input?: unknown) {
  await requirePermission(PERMISSIONS.REALIZATION_READ);
  const values = realizationFiltersSchema.parse(input ?? {});
  const conditions = [
    values.status ? eq(realizationRequest.status, values.status) : undefined,
    values.budgetItemId ? eq(realizationRequest.budgetItemId, values.budgetItemId) : undefined,
    values.query ? or(like(realizationRequest.description, `%${values.query}%`), like(budgetItem.name, `%${values.query}%`)) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const where = conditions.length ? and(...conditions) : undefined;
  const database = getDb();
  const baseQuery = database.select({ realization: realizationRequest, budgetItemName: budgetItem.name, groupName: budgetGroup.name, periodKey: budgetPeriod.periodKey }).from(realizationRequest).innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).innerJoin(budgetPeriod, eq(budgetPeriod.id, budgetGroup.periodId));
  const [items, [{ total }]] = await Promise.all([
    baseQuery.where(where).orderBy(desc(realizationRequest.createdAt)).limit(values.pageSize).offset((values.page - 1) * values.pageSize),
    database.select({ total: count() }).from(realizationRequest).innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).innerJoin(budgetPeriod, eq(budgetPeriod.id, budgetGroup.periodId)).where(where),
  ]);
  return { items, page: values.page, pageSize: values.pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / values.pageSize) };
}

export async function getRealizationDetail(id: string) {
  await requirePermission(PERMISSIONS.REALIZATION_READ);
  const validId = z.string().uuid("Invalid realization ID.").parse(id);
  const [item] = await getDb().select({ realization: realizationRequest, budgetItem: budgetItem, group: budgetGroup, period: budgetPeriod }).from(realizationRequest).innerJoin(budgetItem, eq(budgetItem.id, realizationRequest.budgetItemId)).innerJoin(budgetGroup, eq(budgetGroup.id, budgetItem.groupId)).innerJoin(budgetPeriod, eq(budgetPeriod.id, budgetGroup.periodId)).where(eq(realizationRequest.id, validId)).limit(1);
  if (!item) throw new Error("Realization was not found.");
  const [approvals, transactions] = await Promise.all([
    getDb().select().from(realizationApproval).where(eq(realizationApproval.realizationId, validId)).orderBy(desc(realizationApproval.createdAt)),
    getDb().select().from(financialTransaction).where(and(eq(financialTransaction.relatedEntityType, "REALIZATION"), eq(financialTransaction.relatedEntityId, validId))).orderBy(desc(financialTransaction.createdAt)),
  ]);
  return { ...item, approvals, transactions, calculation: await getRealizationCalculationSnapshot(item.realization.budgetItemId, item.realization.status === "SAH" ? item.realization.id : undefined) };
}

export async function getRealizationCalculation(budgetItemId: string) {
  await requirePermission(PERMISSIONS.REALIZATION_READ);
  return getRealizationCalculationSnapshot(z.string().uuid("Invalid budget item ID.").parse(budgetItemId));
}

export async function createRealization(input: unknown) {
  const session = await requirePermission(PERMISSIONS.REALIZATION_CREATE); const values = parseInput(createRealizationSchema.safeParse(input)); const database = getDb();
  const [item] = await database.select().from(budgetItem).where(eq(budgetItem.id, values.budgetItemId)).limit(1); if (!item) throw new Error("Budget item was not found.");
  const [group] = await database.select().from(budgetGroup).where(eq(budgetGroup.id, item.groupId)).limit(1); const [period] = group ? await database.select().from(budgetPeriod).where(eq(budgetPeriod.id, group.periodId)).limit(1) : []; if (!period || period.status !== "APPROVED") throw new Error("Realizations require an approved budget period.");
  const calculation = await getRealizationCalculationSnapshot(item.id); const isOverAllocation = calculation.committedRealization + values.requestedAmount > item.allocatedAmount; const id = crypto.randomUUID(); const now = new Date();
  await database.transaction(async (tx) => {
    await tx.insert(realizationRequest).values({ id, budgetItemId: item.id, requestedAmount: values.requestedAmount, description: values.description, evidenceKey: optionalValue(values.evidenceKey), correctsRealizationId: null, correctionReason: null, status: "DRAFT", isOverAllocation: isOverAllocation ? 1 : 0, createdBy: session.user.id, verifiedBy: null, approvedBy: null, createdAt: now, updatedAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "REALIZATION", entityId: id, newValues: { budgetItemId: item.id, requestedAmount: values.requestedAmount, isOverAllocation } }));
  });
  if (isOverAllocation) await notifyPermissionHolders({ permission: PERMISSIONS.REALIZATION_APPROVE, ruleKey: "OVER_ALLOCATION", targetKey: id, type: "OVER_ALLOCATION", title: "Realization exceeds allocation", body: "A realization request exceeds its budget allocation and requires approval.", relatedEntityType: "REALIZATION", relatedEntityId: id });
  return { id, isOverAllocation };
}

export async function transitionRealization(input: unknown) {
  const values = parseInput(transitionRealizationSchema.safeParse(input));
  const database = getDb();
  const [current] = await database.select().from(realizationRequest).where(eq(realizationRequest.id, values.id)).limit(1);
  if (!current) throw new Error("Realization was not found.");
  const allowedTransitions: readonly string[] = REALIZATION_TRANSITIONS[current.status as keyof typeof REALIZATION_TRANSITIONS] ?? [];
  if (!allowedTransitions.includes(values.status)) throw new Error(`Cannot change realization from ${current.status} to ${values.status}.`);
  if (values.status === "REJECTED" && !values.notes?.trim()) throw new Error("A rejection reason is required.");
  const required = values.status === "SUBMITTED"
    ? PERMISSIONS.REALIZATION_CREATE
    : values.status === "VERIFIED" || (values.status === "REJECTED" && current.status === "SUBMITTED")
      ? PERMISSIONS.REALIZATION_VERIFY
      : PERMISSIONS.REALIZATION_APPROVE;
  const session = await requirePermission(required);
  const now = new Date();
  await database.transaction(async (tx) => {
    const [updateResult] = await tx.update(realizationRequest).set({ status: values.status, verifiedBy: values.status === "VERIFIED" ? session.user.id : current.verifiedBy, approvedBy: values.status === "SAH" ? session.user.id : current.approvedBy, updatedAt: now }).where(and(eq(realizationRequest.id, current.id), eq(realizationRequest.status, current.status)));
    if (updateResult.affectedRows !== 1) throw new Error("This realization was changed by another user. Refresh and try again.");
    await tx.insert(realizationApproval).values({ id: crypto.randomUUID(), realizationId: current.id, action: values.status, notes: optionalValue(values.notes), actorUserId: session.user.id, createdAt: now });
    if (values.status === "SAH") {
      const [existingTransaction] = await tx.select().from(financialTransaction).where(and(eq(financialTransaction.relatedEntityType, "REALIZATION"), eq(financialTransaction.relatedEntityId, current.id), eq(financialTransaction.status, "SAH"))).limit(1);
      if (existingTransaction) throw new Error("This realization already has an approved cash transaction.");
      if (current.isOverAllocation === 1 && required !== PERMISSIONS.REALIZATION_APPROVE) throw new Error("Over-allocation requires final approval.");
      if (current.correctsRealizationId) {
        const [original] = await tx.select().from(realizationRequest).where(eq(realizationRequest.id, current.correctsRealizationId)).limit(1);
        if (!original || original.status !== "SAH") throw new Error("The original realization correction target is invalid.");
        const [originalTransaction] = await tx.select().from(financialTransaction).where(and(eq(financialTransaction.relatedEntityType, "REALIZATION"), eq(financialTransaction.relatedEntityId, original.id), eq(financialTransaction.status, "SAH"))).limit(1);
        if (!originalTransaction) throw new Error("The original realization cash transaction was not found.");
        await reverseFinancialTransactionRecord(tx, originalTransaction, session.user.id, `Correction for realization ${current.id}`);
        await tx.insert(realizationApproval).values({ id: crypto.randomUUID(), realizationId: original.id, action: "REVERSE", notes: `Replaced by correction ${current.id}`, actorUserId: session.user.id, createdAt: now });
      }
      await tx.insert(financialTransaction).values({ id: crypto.randomUUID(), transactionCode: financeCode(), transactionAt: now, transactionType: "CASH_OUT", amount: current.requestedAmount, description: current.description, relatedEntityType: "REALIZATION", relatedEntityId: current.id, evidenceKey: current.evidenceKey, status: "SAH", createdBy: session.user.id, approvedBy: session.user.id, reversedTransactionId: null, createdAt: now, updatedAt: now });
    }
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: values.status === "SAH" ? AUDIT_ACTIONS.APPROVE : values.status === "VERIFIED" ? AUDIT_ACTIONS.VERIFY : values.status === "REJECTED" ? AUDIT_ACTIONS.REJECT : AUDIT_ACTIONS.SUBMIT, entityType: "REALIZATION", entityId: current.id, oldValues: { status: current.status }, newValues: { status: values.status, notes: optionalValue(values.notes), isOverAllocation: current.isOverAllocation === 1 } }));
  });
  if (values.status === "SUBMITTED") await notifyPermissionHolders({ permission: PERMISSIONS.REALIZATION_VERIFY, ruleKey: "REALIZATION_SUBMITTED", targetKey: current.id, type: "REALIZATION_SUBMITTED", title: "Realization waiting for verification", body: "A realization request was submitted for verification.", relatedEntityType: "REALIZATION", relatedEntityId: current.id });
  if (values.status === "VERIFIED" || values.status === "SAH") await notifyPermissionHolders({ permission: values.status === "VERIFIED" ? PERMISSIONS.REALIZATION_APPROVE : PERMISSIONS.REALIZATION_READ, ruleKey: `REALIZATION_${values.status}`, targetKey: current.id, type: `REALIZATION_${values.status}`, title: values.status === "VERIFIED" ? "Realization verified" : "Realization approved", body: "A realization request changed status and is ready for review.", relatedEntityType: "REALIZATION", relatedEntityId: current.id });
  return { id: current.id, status: values.status };
}

export async function correctRealization(input: unknown) {
  const session = await requirePermission(PERMISSIONS.REALIZATION_CREATE);
  const values = parseInput(correctRealizationSchema.safeParse(input));
  const database = getDb();
  const [original] = await database.select().from(realizationRequest).where(eq(realizationRequest.id, values.id)).limit(1);
  if (!original) throw new Error("Realization was not found.");
  if (original.status !== "SAH") throw new Error("Only SAH realizations can be corrected.");
  const [existingCorrection] = await database.select({ id: realizationRequest.id }).from(realizationRequest).where(eq(realizationRequest.correctsRealizationId, original.id)).limit(1);
  if (existingCorrection) throw new Error("This realization already has a correction request.");
  const [originalTransaction] = await database.select({ id: financialTransaction.id }).from(financialTransaction).where(and(eq(financialTransaction.relatedEntityType, "REALIZATION"), eq(financialTransaction.relatedEntityId, original.id), eq(financialTransaction.status, "SAH"))).limit(1);
  if (!originalTransaction) throw new Error("The original realization cash transaction was not found.");
  const calculation = await getRealizationCalculationSnapshot(original.budgetItemId, original.id);
  const isOverAllocation = calculation.committedRealization + values.requestedAmount > calculation.allocation;
  const id = crypto.randomUUID();
  const now = new Date();
  await database.transaction(async (tx) => {
    await tx.insert(realizationRequest).values({ id, budgetItemId: original.budgetItemId, requestedAmount: values.requestedAmount, description: values.description, evidenceKey: optionalValue(values.evidenceKey), correctsRealizationId: original.id, correctionReason: values.reason, status: "DRAFT", isOverAllocation: isOverAllocation ? 1 : 0, createdBy: session.user.id, verifiedBy: null, approvedBy: null, createdAt: now, updatedAt: now });
    await tx.insert(realizationApproval).values({ id: crypto.randomUUID(), realizationId: id, action: "CORRECT", notes: values.reason, actorUserId: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CORRECT, entityType: "REALIZATION", entityId: original.id, oldValues: { status: "SAH" }, newValues: { correctionId: id, requestedAmount: values.requestedAmount, isOverAllocation } }));
  });
  if (isOverAllocation) await notifyPermissionHolders({ permission: PERMISSIONS.REALIZATION_APPROVE, ruleKey: "OVER_ALLOCATION", targetKey: id, type: "OVER_ALLOCATION", title: "Realization correction exceeds allocation", body: "A realization correction exceeds its budget allocation and requires approval.", relatedEntityType: "REALIZATION", relatedEntityId: id });
  return { id, correctsRealizationId: original.id, isOverAllocation };
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
    await tx.insert(realizationApproval).values({ id: crypto.randomUUID(), realizationId: current.id, action: "REVERSE", notes: values.reason, actorUserId: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.REVERSE, entityType: "REALIZATION", entityId: current.id, oldValues: { status: "SAH" }, newValues: { financialReversalId: reversalId, reason: values.reason } }));
  });
  return { id: current.id, reversalId };
}
