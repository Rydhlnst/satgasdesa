import { and, asc, desc, eq, gte, isNull, like, lte, or } from "drizzle-orm";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { block } from "@/src/db/schema/blocks";
import { blockFieldAssignment, businessActor, duePaymentVerification } from "@/src/db/schema/business-actors";
import { role, userRole } from "@/src/db/schema/rbac";
import { user } from "@/src/db/schema/auth";
import { due, duePayment } from "@/src/db/schema/dues";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { getRequestSession } from "@/src/lib/auth/request-context";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getObjectStorage, validateImageUpload } from "@/src/lib/storage";

import { businessActorFiltersSchema, businessActorSchema, endFieldAssignmentSchema, fieldAssignmentSchema, paymentVerificationSchema, paymentVerificationUploadSchema, updateBusinessActorSchema } from "./schema";

function optionalValue(value?: string): string | null { return value?.trim() || null; }
function parseInput<T>(result: { success: boolean; data?: T }): T {
  if (!result.success || !result.data) {
    const error = new Error("Please check the submitted details and try again.");
    Object.assign(error, { code: "VALIDATION_FAILED", status: 400 });
    throw error;
  }
  return result.data;
}

function jakartaDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = value("year"); const month = value("month"); const day = value("day");
  if (!year || !month || !day) throw new Error("Unable to determine Jakarta date.");
  return `${year}-${month}-${day}`;
}

export async function getBusinessActors(input?: unknown) {
  await requirePermission(PERMISSIONS.BUSINESS_ACTOR_READ);
  const filters = businessActorFiltersSchema.parse(input ?? {});
  const where = filters.query ? or(like(businessActor.name, `%${filters.query}%`), like(businessActor.contact, `%${filters.query}%`)) : undefined;
  return getDb().select().from(businessActor).where(where).orderBy(asc(businessActor.name)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize);
}

export async function createBusinessActor(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUSINESS_ACTOR_MANAGE);
  const values = parseInput(businessActorSchema.safeParse(input));
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(businessActor).values({ id, actorType: values.actorType, name: values.name, representativeName: optionalValue(values.representativeName), contact: optionalValue(values.contact), address: optionalValue(values.address), notes: optionalValue(values.notes), createdAt: now, updatedAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BUSINESS_ACTOR", entityId: id, newValues: { actorType: values.actorType, name: values.name } }));
  });
  return { id };
}

export async function updateBusinessActor(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BUSINESS_ACTOR_MANAGE);
  const values = parseInput(updateBusinessActorSchema.safeParse(input));
  const [existing] = await getDb().select().from(businessActor).where(eq(businessActor.id, values.id)).limit(1);
  if (!existing) { const error = new Error("Business actor was not found."); Object.assign(error, { code: "NOT_FOUND", status: 404 }); throw error; }
  await getDb().transaction(async (tx) => {
    await tx.update(businessActor).set({ actorType: values.actorType, name: values.name, representativeName: optionalValue(values.representativeName), contact: optionalValue(values.contact), address: optionalValue(values.address), notes: optionalValue(values.notes), updatedAt: new Date() }).where(eq(businessActor.id, values.id));
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "BUSINESS_ACTOR", entityId: values.id, oldValues: { name: existing.name, actorType: existing.actorType }, newValues: { name: values.name, actorType: values.actorType } }));
  });
  return { id: values.id };
}

export async function createBlockFieldAssignment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FIELD_ASSIGNMENT_MANAGE);
  const values = parseInput(fieldAssignmentSchema.safeParse(input));
  const database = getDb();
  const [targetBlock] = await database.select({ id: block.id }).from(block).where(eq(block.id, values.blockId)).limit(1);
  if (!targetBlock) { const error = new Error("Block was not found."); Object.assign(error, { code: "NOT_FOUND", status: 404 }); throw error; }
  const id = crypto.randomUUID(); const now = new Date();
  await database.transaction(async (tx) => {
    await tx.insert(blockFieldAssignment).values({ id, blockId: values.blockId, fieldOfficerId: values.fieldOfficerId, startedAt: values.startedAt, endedAt: values.endedAt ?? null, notes: optionalValue(values.notes), assignedBy: session.user.id, createdAt: now, updatedAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BLOCK_FIELD_ASSIGNMENT", entityId: id, newValues: values }));
  });
  return { id };
}

export async function endBlockFieldAssignment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FIELD_ASSIGNMENT_MANAGE);
  const values = parseInput(endFieldAssignmentSchema.safeParse(input));
  const [existing] = await getDb().select().from(blockFieldAssignment).where(eq(blockFieldAssignment.id, values.id)).limit(1);
  if (!existing) { const error = new Error("Field assignment was not found."); Object.assign(error, { code: "NOT_FOUND", status: 404 }); throw error; }
  if (values.endedAt < existing.startedAt) { const error = new Error("End date must not be before assignment start date."); Object.assign(error, { code: "VALIDATION_FAILED", status: 400 }); throw error; }
  await getDb().transaction(async (tx) => {
    await tx.update(blockFieldAssignment).set({ endedAt: values.endedAt, notes: optionalValue(values.notes) ?? existing.notes, updatedAt: new Date() }).where(eq(blockFieldAssignment.id, values.id));
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "BLOCK_FIELD_ASSIGNMENT", entityId: values.id, oldValues: { endedAt: existing.endedAt }, newValues: { endedAt: values.endedAt } }));
  });
  return { id: values.id };
}

export async function getFieldOfficers() {
  await requirePermission(PERMISSIONS.FIELD_ASSIGNMENT_MANAGE);
  return getDb().select({ id: user.id, name: user.name, email: user.email }).from(userRole).innerJoin(role, eq(role.id, userRole.roleId)).innerJoin(user, eq(user.id, userRole.userId)).where(eq(role.name, "PETUGAS_LAPANGAN")).orderBy(asc(user.name));
}

export async function getBlockFieldAssignments() {
  const session = await requirePermission(PERMISSIONS.BLOCK_READ);
  const canManage = await hasPermission(session.user.id, PERMISSIONS.FIELD_ASSIGNMENT_MANAGE);
  const conditions = canManage ? undefined : eq(blockFieldAssignment.fieldOfficerId, session.user.id);
  return getDb().select({ assignment: blockFieldAssignment, block: { id: block.id, code: block.code, name: block.name }, officer: { id: user.id, name: user.name, email: user.email } }).from(blockFieldAssignment).innerJoin(block, eq(block.id, blockFieldAssignment.blockId)).innerJoin(user, eq(user.id, blockFieldAssignment.fieldOfficerId)).where(conditions).orderBy(desc(blockFieldAssignment.startedAt));
}

export async function getAssignedBlocks() {
  const session = await requirePermission(PERMISSIONS.BLOCK_READ);
  const today = jakartaDate();
  const rows = await getDb().select({ assignment: blockFieldAssignment, block }).from(blockFieldAssignment).innerJoin(block, eq(block.id, blockFieldAssignment.blockId)).where(and(eq(blockFieldAssignment.fieldOfficerId, session.user.id), lte(blockFieldAssignment.startedAt, today), or(isNull(blockFieldAssignment.endedAt), gte(blockFieldAssignment.endedAt, today)))).orderBy(asc(block.code));
  return rows.map((row) => ({ ...row.block, assignment: row.assignment }));
}

export async function getAssignedBlockIdsForCurrentUser(): Promise<string[] | null> {
  const session = getRequestSession();
  if (!session || await hasPermission(session.user.id, PERMISSIONS.FIELD_ASSIGNMENT_MANAGE) || !(await hasPermission(session.user.id, PERMISSIONS.PAYMENT_FIELD_VERIFY))) return null;
  const today = jakartaDate();
  const rows = await getDb().select({ blockId: blockFieldAssignment.blockId }).from(blockFieldAssignment).where(and(eq(blockFieldAssignment.fieldOfficerId, session.user.id), lte(blockFieldAssignment.startedAt, today), or(isNull(blockFieldAssignment.endedAt), gte(blockFieldAssignment.endedAt, today))));
  return rows.map((row) => row.blockId);
}

export async function requireAssignedBlockAccess(blockId: string, at = jakartaDate()): Promise<void> {
  const session = getRequestSession();
  if (!session) return;
  if (await hasPermission(session.user.id, PERMISSIONS.FIELD_ASSIGNMENT_MANAGE) || !(await hasPermission(session.user.id, PERMISSIONS.PAYMENT_FIELD_VERIFY))) return;
  const [assignment] = await getDb().select({ id: blockFieldAssignment.id }).from(blockFieldAssignment).where(and(eq(blockFieldAssignment.blockId, blockId), eq(blockFieldAssignment.fieldOfficerId, session.user.id), lte(blockFieldAssignment.startedAt, at), or(isNull(blockFieldAssignment.endedAt), gte(blockFieldAssignment.endedAt, at)))).limit(1);
  if (!assignment) { const error = new Error("This block is not assigned to you."); Object.assign(error, { code: "FORBIDDEN", status: 403 }); throw error; }
}

async function duePaymentScope(duePaymentId: string): Promise<{ paymentId: string; dueId: string; blockId: string }> {
  const [row] = await getDb().select({ paymentId: duePayment.id, dueId: due.id, blockId: due.blockId }).from(duePayment).innerJoin(due, eq(due.id, duePayment.dueId)).where(eq(duePayment.id, duePaymentId)).limit(1);
  if (!row) { const error = new Error("Payment was not found."); Object.assign(error, { code: "NOT_FOUND", status: 404 }); throw error; }
  if (!row.blockId) { const error = new Error("This payment has no block snapshot and must be reconciled first."); Object.assign(error, { code: "CONFLICT", status: 409 }); throw error; }
  return { paymentId: row.paymentId, dueId: row.dueId, blockId: row.blockId };
}

function verificationScope(paymentId: string) { return `due-payment-verifications/${paymentId}`; }

export async function createDuePaymentVerificationUploadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.PAYMENT_FIELD_VERIFY);
  const values = parseInput(paymentVerificationUploadSchema.safeParse(input));
  const payment = await duePaymentScope(values.duePaymentId);
  await requireAssignedBlockAccess(payment.blockId);
  validateImageUpload(values);
  const upload = await getObjectStorage().createUploadUrl({ ...values, scope: verificationScope(values.duePaymentId) });
  return { key: upload.key, uploadUrl: upload.uploadUrl };
}

export async function verifyDuePayment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.PAYMENT_FIELD_VERIFY);
  const values = parseInput(paymentVerificationSchema.safeParse(input));
  const payment = await duePaymentScope(values.duePaymentId);
  await requireAssignedBlockAccess(payment.blockId);
  if (values.evidenceKey && !values.evidenceKey.startsWith(`${verificationScope(values.duePaymentId)}/`)) {
    const error = new Error("Evidence is outside the permitted payment verification scope."); Object.assign(error, { code: "VALIDATION_FAILED", status: 400 }); throw error;
  }
  const id = crypto.randomUUID(); const now = new Date(); const verifiedAt = values.verifiedAt ?? now;
  await getDb().transaction(async (tx) => {
    await tx.insert(duePaymentVerification).values({ id, duePaymentId: values.duePaymentId, verifiedBy: session.user.id, verificationStatus: values.verificationStatus, verifiedAt, latitude: values.latitude?.toFixed(7) ?? null, longitude: values.longitude?.toFixed(7) ?? null, gpsAccuracy: values.gpsAccuracy?.toFixed(2) ?? null, evidenceKey: optionalValue(values.evidenceKey), notes: optionalValue(values.notes), createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "DUE_PAYMENT_VERIFICATION", entityId: id, newValues: { duePaymentId: values.duePaymentId, verificationStatus: values.verificationStatus, verifiedAt: verifiedAt.toISOString() } }));
  });
  return { id };
}

export async function getDuePaymentVerifications(dueId: string) {
  await requirePermission(PERMISSIONS.DUES_READ);
  return getDb().select({ verification: duePaymentVerification, payment: duePayment }).from(duePaymentVerification).innerJoin(duePayment, eq(duePayment.id, duePaymentVerification.duePaymentId)).where(eq(duePayment.dueId, dueId)).orderBy(desc(duePaymentVerification.verifiedAt));
}
