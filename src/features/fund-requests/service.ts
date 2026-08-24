import { and, count, desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { block } from "@/src/db/schema/blocks";
import { budgetCategory, budgetPeriod, budgetSubcategory } from "@/src/db/schema/budgets";
import { fundRequest, fundRequestAttachment, fundRequestEvent } from "@/src/db/schema/fund-requests";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getObjectStorage, validateUpload } from "@/src/lib/storage";
import { createSystemNotificationOnce, notifyPermissionHolders } from "@/src/features/notifications/service";

import { FUND_REQUEST_TRANSITIONS } from "./constants";
import { addFundRequestAttachmentSchema, correctFundRequestSchema, createFundRequestSchema, fundRequestAttachmentDownloadSchema, fundRequestAttachmentUploadSchema, fundRequestFiltersSchema, transitionFundRequestSchema, updateFundRequestSchema } from "./schema";

function parseInput<T>(result: { success: boolean; data?: T }): T {
  if (!result.success || !result.data) throw new Error("Please check the fund request details and try again.");
  return result.data;
}

function optionalValue(value?: string): string | null { return value?.trim() ? value.trim() : null; }
function attachmentScope(id: string): string { return `fund-requests/${id}`; }
function assertAttachmentKey(id: string, key: string): void {
  const scope = `${attachmentScope(id)}/`;
  if (!key.startsWith(scope) || key.slice(scope.length).includes("/") || key.includes("..") || key.includes("\\")) throw new Error("Fund request attachment is outside the permitted storage scope.");
}
function requestNumber(periodKey: string): string { return `PD-${periodKey.replace("-", "")}-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`; }

async function getFundRequestOrThrow(id: string) {
  const [request] = await getDb().select().from(fundRequest).where(eq(fundRequest.id, id)).limit(1);
  if (!request) throw new Error("Fund request was not found.");
  return request;
}

async function assertEditableRequest(id: string, actorUserId: string) {
  const request = await getFundRequestOrThrow(id);
  if (request.createdBy !== actorUserId) throw new Error("Only the request creator can modify this fund request.");
  if (request.status !== "DRAFT" && request.status !== "REVISION_REQUIRED") throw new Error("Only draft or revision-required fund requests can be modified.");
  return request;
}

async function assertReferences(values: { budgetPeriodId: string; budgetCategoryId: string; budgetSubcategoryId?: string; blockId?: string }, allowInactiveCategory = false) {
  const database = getDb();
  const [period, category, subcategory, requestBlock] = await Promise.all([
    database.select().from(budgetPeriod).where(eq(budgetPeriod.id, values.budgetPeriodId)).limit(1).then((rows) => rows[0]),
    database.select().from(budgetCategory).where(eq(budgetCategory.id, values.budgetCategoryId)).limit(1).then((rows) => rows[0]),
    values.budgetSubcategoryId ? database.select().from(budgetSubcategory).where(eq(budgetSubcategory.id, values.budgetSubcategoryId)).limit(1).then((rows) => rows[0]) : Promise.resolve(undefined),
    values.blockId ? database.select({ id: block.id }).from(block).where(eq(block.id, values.blockId)).limit(1).then((rows) => rows[0]) : Promise.resolve(undefined),
  ]);
  if (!period || period.status !== "APPROVED") throw new Error("Fund requests require an approved budget period.");
  if (!category || (!allowInactiveCategory && category.isActive !== 1)) throw new Error("Select an active budget category.");
  if (subcategory && (subcategory.categoryId !== category.id || (!allowInactiveCategory && subcategory.isActive !== 1))) throw new Error("Select an active subcategory belonging to the selected budget category.");
  if (values.blockId && !requestBlock) throw new Error("Selected block was not found.");
  return { period, category, subcategory };
}

function auditActionFor(status: string) {
  if (status === "SUBMITTED") return AUDIT_ACTIONS.SUBMIT;
  if (status === "VERIFIED") return AUDIT_ACTIONS.VERIFY;
  if (status === "APPROVED") return AUDIT_ACTIONS.APPROVE;
  if (status === "REJECTED") return AUDIT_ACTIONS.REJECT;
  return AUDIT_ACTIONS.STATUS_CHANGE;
}

export async function getFundRequests(input?: unknown) {
  const values = fundRequestFiltersSchema.parse(input ?? {});
  const session = await requirePermission(PERMISSIONS.FUND_REQUEST_READ);
  const conditions = [
    values.status ? eq(fundRequest.status, values.status) : undefined,
    values.periodKey ? eq(budgetPeriod.periodKey, values.periodKey) : undefined,
    values.categoryId ? eq(fundRequest.budgetCategoryId, values.categoryId) : undefined,
    values.blockId ? eq(fundRequest.blockId, values.blockId) : undefined,
    values.mine ? eq(fundRequest.createdBy, session.user.id) : undefined,
    values.query ? or(like(fundRequest.requestNumber, `%${values.query}%`), like(fundRequest.title, `%${values.query}%`), like(fundRequest.description, `%${values.query}%`)) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const where = conditions.length ? and(...conditions) : undefined;
  const database = getDb();
  const query = database.select({ request: fundRequest, periodKey: budgetPeriod.periodKey, categoryName: budgetCategory.name, subcategoryName: budgetSubcategory.name, blockCode: block.code, blockName: block.name }).from(fundRequest).innerJoin(budgetPeriod, eq(budgetPeriod.id, fundRequest.budgetPeriodId)).innerJoin(budgetCategory, eq(budgetCategory.id, fundRequest.budgetCategoryId)).leftJoin(budgetSubcategory, eq(budgetSubcategory.id, fundRequest.budgetSubcategoryId)).leftJoin(block, eq(block.id, fundRequest.blockId));
  const [items, [{ total }]] = await Promise.all([
    query.where(where).orderBy(desc(fundRequest.createdAt)).limit(values.pageSize).offset((values.page - 1) * values.pageSize),
    database.select({ total: count() }).from(fundRequest).innerJoin(budgetPeriod, eq(budgetPeriod.id, fundRequest.budgetPeriodId)).where(where),
  ]);
  return { items, page: values.page, pageSize: values.pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / values.pageSize) };
}

export async function getFundRequestDetail(id: string) {
  await requirePermission(PERMISSIONS.FUND_REQUEST_READ);
  const validId = z.string().uuid("Invalid fund request ID.").parse(id);
  const [item] = await getDb().select({ request: fundRequest, period: budgetPeriod, category: budgetCategory, subcategory: budgetSubcategory, block }).from(fundRequest).innerJoin(budgetPeriod, eq(budgetPeriod.id, fundRequest.budgetPeriodId)).innerJoin(budgetCategory, eq(budgetCategory.id, fundRequest.budgetCategoryId)).leftJoin(budgetSubcategory, eq(budgetSubcategory.id, fundRequest.budgetSubcategoryId)).leftJoin(block, eq(block.id, fundRequest.blockId)).where(eq(fundRequest.id, validId)).limit(1);
  if (!item) throw new Error("Fund request was not found.");
  const [attachments, events, corrections] = await Promise.all([
    getDb().select().from(fundRequestAttachment).where(eq(fundRequestAttachment.fundRequestId, validId)).orderBy(desc(fundRequestAttachment.createdAt)),
    getDb().select().from(fundRequestEvent).where(eq(fundRequestEvent.fundRequestId, validId)).orderBy(desc(fundRequestEvent.createdAt)),
    getDb().select({ id: fundRequest.id, requestNumber: fundRequest.requestNumber, status: fundRequest.status, amount: fundRequest.amount, createdAt: fundRequest.createdAt }).from(fundRequest).where(eq(fundRequest.revisionOfId, validId)).orderBy(desc(fundRequest.createdAt)),
  ]);
  return { ...item, attachments, events, corrections };
}

export async function createFundRequest(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FUND_REQUEST_CREATE);
  const values = parseInput(createFundRequestSchema.safeParse(input));
  const { period } = await assertReferences(values);
  const id = crypto.randomUUID(); const now = new Date(); const number = requestNumber(period.periodKey);
  await getDb().transaction(async (tx) => {
    await tx.insert(fundRequest).values({ id, requestNumber: number, ...values, budgetSubcategoryId: values.budgetSubcategoryId ?? null, blockId: values.blockId ?? null, status: "DRAFT", revisionOfId: null, correctionReason: null, cancellationReason: null, submittedAt: null, verifiedAt: null, approvedAt: null, createdBy: session.user.id, verifiedBy: null, approvedBy: null, createdAt: now, updatedAt: now });
    await tx.insert(fundRequestEvent).values({ id: crypto.randomUUID(), fundRequestId: id, action: "CREATE", notes: null, actorUserId: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "FUND_REQUEST", entityId: id, newValues: { requestNumber: number, amount: values.amount, budgetPeriodId: values.budgetPeriodId, budgetCategoryId: values.budgetCategoryId } }));
  });
  return { id, requestNumber: number };
}

export async function updateFundRequest(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FUND_REQUEST_CREATE);
  const values = parseInput(updateFundRequestSchema.safeParse(input));
  const current = await assertEditableRequest(values.id, session.user.id);
  await assertReferences(values, current.budgetCategoryId === values.budgetCategoryId);
  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.update(fundRequest).set({ budgetPeriodId: values.budgetPeriodId, budgetCategoryId: values.budgetCategoryId, budgetSubcategoryId: values.budgetSubcategoryId ?? null, blockId: values.blockId ?? null, title: values.title, description: values.description, amount: values.amount, requestedAt: values.requestedAt, status: "DRAFT", updatedAt: now }).where(and(eq(fundRequest.id, current.id), eq(fundRequest.status, current.status)));
    await tx.insert(fundRequestEvent).values({ id: crypto.randomUUID(), fundRequestId: current.id, action: current.status === "REVISION_REQUIRED" ? "REVISED" : "UPDATED", notes: null, actorUserId: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "FUND_REQUEST", entityId: current.id, oldValues: { status: current.status, amount: current.amount }, newValues: { status: "DRAFT", amount: values.amount } }));
  });
  return { id: current.id, status: "DRAFT" };
}

export async function transitionFundRequest(input: unknown) {
  const values = parseInput(transitionFundRequestSchema.safeParse(input));
  const current = await getFundRequestOrThrow(values.id);
  const allowed: readonly string[] = FUND_REQUEST_TRANSITIONS[current.status as keyof typeof FUND_REQUEST_TRANSITIONS] ?? [];
  if (!allowed.includes(values.status)) throw new Error(`Cannot change fund request from ${current.status} to ${values.status}.`);
  if (["REVISION_REQUIRED", "REJECTED", "CANCELLED"].includes(values.status) && !values.notes?.trim()) throw new Error("A reason is required for this decision.");
  const requiredPermission = values.status === "SUBMITTED" || values.status === "CANCELLED" ? PERMISSIONS.FUND_REQUEST_CREATE : values.status === "VERIFIED" || (values.status !== "APPROVED" && current.status === "SUBMITTED") ? PERMISSIONS.FUND_REQUEST_VERIFY : PERMISSIONS.FUND_REQUEST_APPROVE;
  const session = await requirePermission(requiredPermission);
  if (["SUBMITTED", "CANCELLED"].includes(values.status) && current.createdBy !== session.user.id) throw new Error("Only the request creator can submit or cancel this fund request.");
  if (["VERIFIED", "REVISION_REQUIRED", "REJECTED", "APPROVED"].includes(values.status) && current.createdBy === session.user.id) throw new Error("A fund request cannot be reviewed or approved by its creator.");
  const now = new Date();
  await getDb().transaction(async (tx) => {
    const [result] = await tx.update(fundRequest).set({ status: values.status, cancellationReason: values.status === "CANCELLED" ? optionalValue(values.notes) : current.cancellationReason, submittedAt: values.status === "SUBMITTED" ? now : current.submittedAt, verifiedAt: values.status === "VERIFIED" ? now : current.verifiedAt, approvedAt: values.status === "APPROVED" ? now : current.approvedAt, verifiedBy: values.status === "VERIFIED" ? session.user.id : current.verifiedBy, approvedBy: values.status === "APPROVED" ? session.user.id : current.approvedBy, updatedAt: now }).where(and(eq(fundRequest.id, current.id), eq(fundRequest.status, current.status)));
    if (result.affectedRows !== 1) throw new Error("This fund request was changed by another user. Refresh and try again.");
    await tx.insert(fundRequestEvent).values({ id: crypto.randomUUID(), fundRequestId: current.id, action: values.status, notes: optionalValue(values.notes), actorUserId: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: auditActionFor(values.status), entityType: "FUND_REQUEST", entityId: current.id, oldValues: { status: current.status }, newValues: { status: values.status, notes: optionalValue(values.notes) } }));
  });
  if (values.status === "SUBMITTED") await notifyPermissionHolders({ permission: PERMISSIONS.FUND_REQUEST_VERIFY, ruleKey: "FUND_REQUEST_SUBMITTED", targetKey: current.id, type: "FUND_REQUEST_SUBMITTED", title: "Fund request waiting for verification", body: `${current.requestNumber} was submitted for verification.`, relatedEntityType: "FUND_REQUEST", relatedEntityId: current.id });
  if (values.status === "VERIFIED") await notifyPermissionHolders({ permission: PERMISSIONS.FUND_REQUEST_APPROVE, ruleKey: "FUND_REQUEST_VERIFIED", targetKey: current.id, type: "FUND_REQUEST_VERIFIED", title: "Fund request verified", body: `${current.requestNumber} is ready for approval.`, relatedEntityType: "FUND_REQUEST", relatedEntityId: current.id });
  if (["APPROVED", "REVISION_REQUIRED", "REJECTED"].includes(values.status)) await createSystemNotificationOnce({ recipientUserId: current.createdBy, ruleKey: `FUND_REQUEST_${values.status}`, targetKey: current.id, type: `FUND_REQUEST_${values.status}`, title: `Fund request ${values.status.toLowerCase().replaceAll("_", " ")}`, body: `${current.requestNumber} changed to ${values.status}.`, relatedEntityType: "FUND_REQUEST", relatedEntityId: current.id });
  return { id: current.id, status: values.status };
}

export async function correctFundRequest(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FUND_REQUEST_CREATE);
  const values = parseInput(correctFundRequestSchema.safeParse(input));
  const original = await getFundRequestOrThrow(values.id);
  if (original.createdBy !== session.user.id) throw new Error("Only the request creator can correct this fund request.");
  if (original.status !== "APPROVED") throw new Error("Only approved fund requests can be corrected.");
  const [existing] = await getDb().select({ id: fundRequest.id }).from(fundRequest).where(eq(fundRequest.revisionOfId, original.id)).limit(1);
  if (existing) throw new Error("This fund request already has a correction request.");
  const { period } = await assertReferences(values, original.budgetCategoryId === values.budgetCategoryId);
  const id = crypto.randomUUID(); const now = new Date(); const number = requestNumber(period.periodKey);
  await getDb().transaction(async (tx) => {
    await tx.insert(fundRequest).values({ id, requestNumber: number, budgetPeriodId: values.budgetPeriodId, budgetCategoryId: values.budgetCategoryId, budgetSubcategoryId: values.budgetSubcategoryId ?? null, blockId: values.blockId ?? null, title: values.title, description: values.description, amount: values.amount, requestedAt: values.requestedAt, status: "DRAFT", revisionOfId: original.id, correctionReason: values.reason, cancellationReason: null, submittedAt: null, verifiedAt: null, approvedAt: null, createdBy: session.user.id, verifiedBy: null, approvedBy: null, createdAt: now, updatedAt: now });
    await tx.insert(fundRequestEvent).values({ id: crypto.randomUUID(), fundRequestId: id, action: "CORRECTION_CREATED", notes: values.reason, actorUserId: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CORRECT, entityType: "FUND_REQUEST", entityId: original.id, newValues: { correctionId: id, requestNumber: number, reason: values.reason } }));
  });
  return { id, requestNumber: number, revisionOfId: original.id };
}

export async function createFundRequestAttachmentUploadUrl(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FUND_REQUEST_CREATE);
  const values = parseInput(fundRequestAttachmentUploadSchema.safeParse(input));
  await assertEditableRequest(values.fundRequestId, session.user.id);
  validateUpload(values);
  const upload = await getObjectStorage().createUploadUrl({ ...values, scope: attachmentScope(values.fundRequestId) });
  assertAttachmentKey(values.fundRequestId, upload.key);
  return { key: upload.key, uploadUrl: upload.uploadUrl };
}

export async function addFundRequestAttachment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FUND_REQUEST_CREATE);
  const values = parseInput(addFundRequestAttachmentSchema.safeParse(input));
  const request = await assertEditableRequest(values.fundRequestId, session.user.id);
  assertAttachmentKey(request.id, values.storageKey);
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(fundRequestAttachment).values({ id, fundRequestId: request.id, storageKey: values.storageKey, contentType: values.contentType, sizeBytes: values.sizeBytes, caption: optionalValue(values.caption), createdBy: session.user.id, createdAt: now });
    await tx.insert(fundRequestEvent).values({ id: crypto.randomUUID(), fundRequestId: request.id, action: "ATTACHMENT_ADDED", notes: optionalValue(values.caption), actorUserId: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "FUND_REQUEST_ATTACHMENT", entityId: id, newValues: { fundRequestId: request.id, storageKey: values.storageKey } }));
  });
  return { id };
}

export async function getFundRequestAttachmentDownloadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.FUND_REQUEST_READ);
  const values = parseInput(fundRequestAttachmentDownloadSchema.safeParse(input));
  const [attachment] = await getDb().select({ storageKey: fundRequestAttachment.storageKey }).from(fundRequestAttachment).where(eq(fundRequestAttachment.id, values.id)).limit(1);
  if (!attachment) throw new Error("Fund request attachment was not found.");
  return { downloadUrl: await getObjectStorage().createDownloadUrl(attachment.storageKey) };
}
