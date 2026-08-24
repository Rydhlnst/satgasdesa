import { and, asc, desc, eq, inArray, isNull, like, or } from "drizzle-orm";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { user } from "@/src/db/schema/auth";
import { block } from "@/src/db/schema/blocks";
import { fieldTask, fieldWorker, workerBlockAssignment } from "@/src/db/schema/field-work";
import { blockHistory } from "@/src/db/schema/history-evidence";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getAssignedBlockIdsForCurrentUser, requireAssignedBlockAccess } from "@/src/features/field-operations/service";

import { endWorkerAssignmentSchema, fieldTaskSchema, fieldWorkerSchema, taskFiltersSchema, updateFieldTaskSchema, updateFieldWorkerSchema, workerAssignmentSchema, workerFiltersSchema } from "./schema";

function optional(value?: string | null): string | null { return value?.trim() || null; }
type TransactionContext = Pick<ReturnType<typeof getDb>, "insert">;

function failure(message: string, status: number, code: string) {
  const error = new Error(message);
  Object.assign(error, { status, code });
  return error;
}

async function canManageAll(userId: string) {
  return hasPermission(userId, PERMISSIONS.FIELD_ASSIGNMENT_MANAGE);
}

async function writeBlockEvent(tx: TransactionContext, values: { blockId: string; action: string; changedBy: string; oldValues?: unknown; newValues?: unknown }) {
  await tx.insert(blockHistory).values({
    id: crypto.randomUUID(),
    blockId: values.blockId,
    action: values.action,
    oldValues: values.oldValues ? JSON.stringify(values.oldValues) : null,
    newValues: values.newValues ? JSON.stringify(values.newValues) : null,
    changedBy: values.changedBy,
    createdAt: new Date(),
  });
}

export async function getFieldTasks(input?: unknown) {
  const session = await requirePermission(PERMISSIONS.FIELD_TASK_READ);
  const filters = taskFiltersSchema.parse(input ?? {});
  const admin = await canManageAll(session.user.id);
  const conditions = [];
  if (filters.query) conditions.push(or(like(fieldTask.title, `%${filters.query}%`), like(fieldTask.description, `%${filters.query}%`)));
  if (filters.status) conditions.push(eq(fieldTask.status, filters.status));
  if (filters.priority) conditions.push(eq(fieldTask.priority, filters.priority));
  if (filters.blockId) conditions.push(eq(fieldTask.blockId, filters.blockId));
  if (!admin || filters.mine) conditions.push(eq(fieldTask.assignedFieldOfficerId, session.user.id));
  const items = await getDb().select().from(fieldTask).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(fieldTask.status), asc(fieldTask.dueDate), desc(fieldTask.updatedAt)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize);
  return { items, page: filters.page, pageSize: filters.pageSize };
}

export async function getFieldTask(id: string) {
  const session = await requirePermission(PERMISSIONS.FIELD_TASK_READ);
  const [item] = await getDb().select().from(fieldTask).where(eq(fieldTask.id, id)).limit(1);
  if (!item) throw failure("Field task was not found.", 404, "NOT_FOUND");
  const admin = await canManageAll(session.user.id);
  if (!admin && item.assignedFieldOfficerId !== session.user.id) throw failure("You do not have access to this field task.", 403, "FORBIDDEN");
  return item;
}

export async function createFieldTask(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FIELD_TASK_MANAGE);
  if (!await canManageAll(session.user.id)) throw failure("Only leaders can assign field tasks.", 403, "FORBIDDEN");
  const values = fieldTaskSchema.parse(input);
  const database = getDb();
  const [targetBlock, officer] = await Promise.all([
    database.select({ id: block.id }).from(block).where(and(eq(block.id, values.blockId), isNull(block.archivedAt))).limit(1),
    database.select({ id: user.id }).from(user).where(eq(user.id, values.assignedFieldOfficerId)).limit(1),
  ]);
  if (!targetBlock[0]) throw failure("Block was not found or is archived.", 404, "NOT_FOUND");
  if (!officer[0]) throw failure("Assigned field officer was not found.", 404, "NOT_FOUND");
  const id = crypto.randomUUID(); const now = new Date();
  await database.transaction(async (tx) => {
    await tx.insert(fieldTask).values({ id, ...values, assignedWorkerId: values.assignedWorkerId ?? null, description: optional(values.description), status: "TODO", completedAt: null, createdBy: session.user.id, updatedBy: session.user.id, createdAt: now, updatedAt: now });
    await writeBlockEvent(tx, { blockId: values.blockId, action: "FIELD_TASK_CREATED", changedBy: session.user.id, newValues: { taskId: id, title: values.title, assignedFieldOfficerId: values.assignedFieldOfficerId } });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "FIELD_TASK", entityId: id, newValues: values }));
  });
  return getFieldTask(id);
}

export async function updateFieldTask(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FIELD_TASK_MANAGE);
  const values = updateFieldTaskSchema.parse(input);
  const [existing] = await getDb().select().from(fieldTask).where(eq(fieldTask.id, values.id)).limit(1);
  if (!existing) throw failure("Field task was not found.", 404, "NOT_FOUND");
  const admin = await canManageAll(session.user.id);
  if (!admin) {
    if (existing.assignedFieldOfficerId !== session.user.id) throw failure("You can only update your assigned tasks.", 403, "FORBIDDEN");
    await requireAssignedBlockAccess(existing.blockId);
    const allowed = new Set(["id", "status"]);
    if (Object.keys(values).some((key) => !allowed.has(key))) throw failure("Field officers can only update task status.", 403, "FORBIDDEN");
  }
  if (["DONE", "CANCELLED"].includes(existing.status) && !admin) throw failure("Finalized tasks cannot be changed.", 409, "CONFLICT");
  const nextStatus = values.status ?? existing.status;
  const now = new Date();
  const next = {
    assignedFieldOfficerId: values.assignedFieldOfficerId ?? existing.assignedFieldOfficerId,
    assignedWorkerId: values.assignedWorkerId === undefined ? existing.assignedWorkerId : values.assignedWorkerId,
    title: values.title ?? existing.title,
    description: values.description === undefined ? existing.description : optional(values.description),
    priority: values.priority ?? existing.priority,
    status: nextStatus,
    dueDate: values.dueDate === undefined ? existing.dueDate : values.dueDate,
    completedAt: nextStatus === "DONE" ? now : nextStatus === "TODO" || nextStatus === "IN_PROGRESS" ? null : existing.completedAt,
    updatedBy: session.user.id,
    updatedAt: now,
  };
  await getDb().transaction(async (tx) => {
    await tx.update(fieldTask).set(next).where(eq(fieldTask.id, values.id));
    await writeBlockEvent(tx, { blockId: existing.blockId, action: "FIELD_TASK_UPDATED", changedBy: session.user.id, oldValues: { status: existing.status, title: existing.title }, newValues: { status: next.status, title: next.title } });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "FIELD_TASK", entityId: values.id, oldValues: { status: existing.status, title: existing.title }, newValues: { status: next.status, title: next.title } }));
  });
  return getFieldTask(values.id);
}

export async function getFieldWorkers(input?: unknown) {
  const session = await requirePermission(PERMISSIONS.WORKER_READ);
  const filters = workerFiltersSchema.parse(input ?? {});
  const admin = await canManageAll(session.user.id);
  const assignedBlockIds = admin ? undefined : await getAssignedBlockIdsForCurrentUser();
  if (assignedBlockIds && !assignedBlockIds.length) return { items: [], page: filters.page, pageSize: filters.pageSize };
  const conditions = [];
  if (filters.query) conditions.push(or(like(fieldWorker.fullName, `%${filters.query}%`), like(fieldWorker.position, `%${filters.query}%`), like(fieldWorker.phone, `%${filters.query}%`)));
  if (filters.status) conditions.push(eq(fieldWorker.status, filters.status));
  const assignmentConditions = [eq(workerBlockAssignment.workerId, fieldWorker.id), isNull(workerBlockAssignment.endedAt)];
  if (filters.blockId) assignmentConditions.push(eq(workerBlockAssignment.blockId, filters.blockId));
  if (assignedBlockIds) assignmentConditions.push(inArray(workerBlockAssignment.blockId, assignedBlockIds));
  const items = await getDb().select({ worker: fieldWorker, blockId: workerBlockAssignment.blockId }).from(fieldWorker).leftJoin(workerBlockAssignment, and(...assignmentConditions)).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(fieldWorker.fullName)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize);
  return { items: items.map((item) => ({ ...item.worker, currentBlockId: item.blockId ?? null })), page: filters.page, pageSize: filters.pageSize };
}

export async function getFieldWorker(id: string) {
  const session = await requirePermission(PERMISSIONS.WORKER_READ);
  const [item] = await getDb().select().from(fieldWorker).where(eq(fieldWorker.id, id)).limit(1);
  if (!item) throw failure("Worker was not found.", 404, "NOT_FOUND");
  const assignments = await getDb().select().from(workerBlockAssignment).where(eq(workerBlockAssignment.workerId, id)).orderBy(desc(workerBlockAssignment.startedAt));
  if (!await canManageAll(session.user.id)) {
    const assignedBlockIds = await getAssignedBlockIdsForCurrentUser();
    if (!assignedBlockIds?.length || !assignments.some((assignment) => assignedBlockIds.includes(assignment.blockId))) throw failure("You do not have access to this worker.", 403, "FORBIDDEN");
  }
  return { item, assignments };
}

export async function createFieldWorker(input: unknown) {
  const session = await requirePermission(PERMISSIONS.WORKER_MANAGE);
  const values = fieldWorkerSchema.parse(input); const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(fieldWorker).values({ id, fullName: values.fullName, phone: optional(values.phone), position: optional(values.position), photoKey: optional(values.photoKey), status: values.status, notes: optional(values.notes), createdBy: session.user.id, createdAt: now, updatedAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "FIELD_WORKER", entityId: id, newValues: values }));
  });
  return getFieldWorker(id);
}

export async function updateFieldWorker(input: unknown) {
  const session = await requirePermission(PERMISSIONS.WORKER_MANAGE);
  const values = updateFieldWorkerSchema.parse(input);
  const [existing] = await getDb().select().from(fieldWorker).where(eq(fieldWorker.id, values.id)).limit(1);
  if (!existing) throw failure("Worker was not found.", 404, "NOT_FOUND");
  await getDb().transaction(async (tx) => {
    await tx.update(fieldWorker).set({ fullName: values.fullName, phone: optional(values.phone), position: optional(values.position), photoKey: optional(values.photoKey), status: values.status, notes: optional(values.notes), updatedAt: new Date() }).where(eq(fieldWorker.id, values.id));
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "FIELD_WORKER", entityId: values.id, oldValues: { status: existing.status, fullName: existing.fullName }, newValues: { status: values.status, fullName: values.fullName } }));
  });
  return getFieldWorker(values.id);
}

export async function assignWorkerToBlock(input: unknown) {
  const session = await requirePermission(PERMISSIONS.WORKER_MANAGE);
  const values = workerAssignmentSchema.parse(input); const database = getDb();
  const [worker, targetBlock, activeAssignment] = await Promise.all([
    database.select({ id: fieldWorker.id }).from(fieldWorker).where(eq(fieldWorker.id, values.workerId)).limit(1),
    database.select({ id: block.id }).from(block).where(and(eq(block.id, values.blockId), isNull(block.archivedAt))).limit(1),
    database.select().from(workerBlockAssignment).where(and(eq(workerBlockAssignment.workerId, values.workerId), isNull(workerBlockAssignment.endedAt))).limit(1),
  ]);
  if (!worker[0] || !targetBlock[0]) throw failure("Worker or active block was not found.", 404, "NOT_FOUND");
  if (activeAssignment[0]) throw failure("Worker already has an active block assignment. End it before transferring.", 409, "CONFLICT");
  const id = crypto.randomUUID(); const now = new Date();
  await database.transaction(async (tx) => {
    await tx.insert(workerBlockAssignment).values({ id, ...values, endedAt: values.endedAt ?? null, notes: optional(values.notes), assignedBy: session.user.id, createdAt: now, updatedAt: now });
    await writeBlockEvent(tx, { blockId: values.blockId, action: "WORKER_ASSIGNED", changedBy: session.user.id, newValues: { workerId: values.workerId, assignmentId: id } });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "WORKER_BLOCK_ASSIGNMENT", entityId: id, newValues: values }));
  });
  return { id };
}

export async function endWorkerBlockAssignment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.WORKER_MANAGE);
  const values = endWorkerAssignmentSchema.parse(input);
  const [existing] = await getDb().select().from(workerBlockAssignment).where(eq(workerBlockAssignment.id, values.id)).limit(1);
  if (!existing) throw failure("Worker assignment was not found.", 404, "NOT_FOUND");
  if (values.endedAt < existing.startedAt) throw failure("End date must not be before start date.", 400, "VALIDATION_FAILED");
  await getDb().transaction(async (tx) => {
    await tx.update(workerBlockAssignment).set({ endedAt: values.endedAt, notes: optional(values.notes) ?? existing.notes, updatedAt: new Date() }).where(eq(workerBlockAssignment.id, values.id));
    await writeBlockEvent(tx, { blockId: existing.blockId, action: "WORKER_UNASSIGNED", changedBy: session.user.id, oldValues: { workerId: existing.workerId }, newValues: { endedAt: values.endedAt } });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "WORKER_BLOCK_ASSIGNMENT", entityId: values.id, oldValues: { endedAt: existing.endedAt }, newValues: { endedAt: values.endedAt } }));
  });
  return { id: values.id };
}
