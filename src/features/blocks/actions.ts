"use server";

import { and, desc, eq, inArray, isNull, like, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { block, blockPhoto } from "@/src/db/schema/blocks";
import { blockHistory } from "@/src/db/schema/history-evidence";
import { blockManager } from "@/src/db/schema/block-managers";
import { dailyInformation } from "@/src/db/schema/daily-information";
import { due } from "@/src/db/schema/dues";
import { excavator, excavatorMovement } from "@/src/db/schema/excavators";
import { inspection } from "@/src/db/schema/inspections";
import { fieldTask, fieldWorker, workerBlockAssignment } from "@/src/db/schema/field-work";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getObjectStorage, validateImageUpload } from "@/src/lib/storage";
import { getAssignedBlockIdsForCurrentUser, requireAssignedBlockAccess } from "@/src/features/field-operations/service";

import { addBlockPhotoSchema, blockArchiveSchema, blockFormSchema, blockIdSchema, blockPhotoDownloadSchema, blockPhotoUploadSchema, type BlockFormValues } from "./schema";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseBlockForm(formData: FormData): BlockFormValues {
  const parsed = blockFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error("Please check the block details and try again.");
  return parsed.data;
}

function optionalValue(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

function blockPhotoScope(blockId: string): string { return `blocks/${blockId}`; }
function assertBlockPhotoKey(blockId: string, storageKey: string): void {
  const scope = `${blockPhotoScope(blockId)}/`;
  const suffix = storageKey.startsWith(scope) ? storageKey.slice(scope.length) : "";
  if (!suffix || suffix.includes("/") || suffix.includes("\\") || suffix.includes("..")) throw new Error("Block photo key is outside the permitted storage scope.");
}

function blockValues(values: BlockFormValues) {
  return {
    code: values.code,
    name: values.name,
    status: values.status,
    latitude: values.latitude.toFixed(7),
    longitude: values.longitude.toFixed(7),
    locationPhotoKey: optionalValue(values.locationPhotoKey ?? ""),
    managerName: optionalValue(values.managerName ?? ""),
    locationPicName: optionalValue(values.locationPicName ?? ""),
    fieldPicName: optionalValue(values.fieldPicName ?? ""),
    contact: optionalValue(values.contact ?? ""),
    areaHectares: values.areaHectares === undefined ? null : values.areaHectares.toFixed(2),
    priority: values.priority,
    workerCount: values.workerCount,
    operationalCondition: values.operationalCondition,
    startDate: optionalValue(values.startDate ?? ""),
    notes: optionalValue(values.notes ?? ""),
    updatedAt: new Date(),
  };
}

export async function getBlocks(search?: string, status?: string, options?: { priority?: string; includeArchived?: boolean }) {
  await requirePermission(PERMISSIONS.BLOCK_READ);
  const normalizedSearch = search?.trim();
  const filters = [];

  if (normalizedSearch) {
    filters.push(or(like(block.code, `%${normalizedSearch}%`), like(block.name, `%${normalizedSearch}%`)));
  }
  if (status && ["ACTIVE", "STOPPED", "NOT_OPERATING"].includes(status)) {
    filters.push(eq(block.status, status));
  }
  if (options?.priority && ["LOW", "NORMAL", "HIGH", "CRITICAL"].includes(options.priority)) filters.push(eq(block.priority, options.priority));
  if (!options?.includeArchived) filters.push(isNull(block.archivedAt));
  const assignedBlockIds = await getAssignedBlockIdsForCurrentUser();
  if (assignedBlockIds) {
    if (!assignedBlockIds.length) return [];
    filters.push(inArray(block.id, assignedBlockIds));
  }

  return getDb()
    .select()
    .from(block)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(block.code)
    .limit(100);
}

export async function getBlock(id: string) {
  await requirePermission(PERMISSIONS.BLOCK_READ);
  const validId = blockIdSchema.parse(id);
  await requireAssignedBlockAccess(validId);
  const [result] = await getDb().select().from(block).where(eq(block.id, validId)).limit(1);
  return result ?? null;
}

export async function getBlockDetails(id: string) {
  await requirePermission(PERMISSIONS.BLOCK_READ);
  const validId = blockIdSchema.parse(id);
  await requireAssignedBlockAccess(validId);
  const database = getDb();
  const [item] = await database.select().from(block).where(eq(block.id, validId)).limit(1);
  if (!item) return null;

  const [excavators, inspections, dailyInformationItems, managers, manualHistory, photos, workers, tasks, dues, excavatorMovements] = await Promise.all([
    database.select().from(excavator).where(eq(excavator.currentBlockId, validId)).orderBy(excavator.unitCode),
    database.select().from(inspection).where(eq(inspection.blockId, validId)).orderBy(desc(inspection.inspectedAt)),
    database.select().from(dailyInformation).where(eq(dailyInformation.blockId, validId)).orderBy(desc(dailyInformation.reportedAt)),
    database.select().from(blockManager).where(eq(blockManager.blockId, validId)).orderBy(desc(blockManager.startedAt)),
    database.select().from(blockHistory).where(eq(blockHistory.blockId, validId)).orderBy(desc(blockHistory.createdAt)),
    database.select().from(blockPhoto).where(eq(blockPhoto.blockId, validId)).orderBy(desc(blockPhoto.createdAt)),
    database.select({ assignment: workerBlockAssignment, worker: fieldWorker }).from(workerBlockAssignment).innerJoin(fieldWorker, eq(fieldWorker.id, workerBlockAssignment.workerId)).where(eq(workerBlockAssignment.blockId, validId)).orderBy(desc(workerBlockAssignment.startedAt)),
    database.select().from(fieldTask).where(eq(fieldTask.blockId, validId)).orderBy(desc(fieldTask.updatedAt)),
    database.select().from(due).where(eq(due.blockId, validId)).orderBy(desc(due.updatedAt)),
    database.select().from(excavatorMovement).where(or(eq(excavatorMovement.fromBlockId, validId), eq(excavatorMovement.toBlockId, validId))).orderBy(desc(excavatorMovement.occurredAt)),
  ]);
  const automaticHistory = [
    ...inspections.filter((entry) => entry.status === "SUBMITTED").map((entry) => ({ id: `inspection-${entry.id}`, action: "INSPECTION_SUBMITTED", oldValues: null, newValues: JSON.stringify({ condition: entry.condition, status: entry.status }), changedBy: entry.inspectorId, createdAt: entry.inspectedAt })),
    ...dailyInformationItems.map((entry) => ({ id: `information-${entry.id}`, action: `INFORMATION_${entry.status}`, oldValues: null, newValues: JSON.stringify({ category: entry.category, priority: entry.priority }), changedBy: entry.lastUpdatedBy, createdAt: entry.updatedAt })),
    ...dues.map((entry) => ({ id: `due-${entry.id}`, action: `DUE_${entry.status}`, oldValues: null, newValues: JSON.stringify({ dueType: entry.dueType, amountDue: entry.amountDue, amountPaid: entry.amountPaid }), changedBy: entry.createdBy, createdAt: entry.updatedAt })),
    ...excavatorMovements.map((entry) => ({ id: `excavator-movement-${entry.id}`, action: `EXCAVATOR_${entry.movementType}`, oldValues: null, newValues: JSON.stringify({ excavatorId: entry.excavatorId, fromBlockId: entry.fromBlockId, toBlockId: entry.toBlockId }), changedBy: entry.createdBy, createdAt: entry.occurredAt })),
  ];
  const history = [...manualHistory, ...automaticHistory].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  return { item, excavators, inspections, dailyInformation: dailyInformationItems, managers, photos, workers, tasks, history };
}

export async function archiveBlockRecord(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BLOCK_ARCHIVE);
  const values = blockArchiveSchema.parse(input);
  const [existing] = await getDb().select().from(block).where(eq(block.id, values.id)).limit(1);
  if (!existing) { const error = new Error("Block was not found."); Object.assign(error, { code: "NOT_FOUND", status: 404 }); throw error; }
  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.update(block).set({ archivedAt: values.archived ? now : null, archivedBy: values.archived ? session.user.id : null, updatedAt: now }).where(eq(block.id, values.id));
    await tx.insert(blockHistory).values({ id: crypto.randomUUID(), blockId: values.id, action: values.archived ? "ARCHIVE" : "RESTORE", oldValues: JSON.stringify({ archivedAt: existing.archivedAt }), newValues: JSON.stringify({ archivedAt: values.archived ? now : null, reason: values.reason ?? null }), changedBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.STATUS_CHANGE, entityType: "BLOCK", entityId: values.id, oldValues: { archivedAt: existing.archivedAt }, newValues: { archivedAt: values.archived ? now : null, reason: values.reason ?? null } }));
  });
  return getBlock(values.id);
}

export async function createBlockPhotoUploadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.BLOCK_UPDATE);
  const values = blockPhotoUploadSchema.parse(input);
  await requireAssignedBlockAccess(values.blockId);
  validateImageUpload({ contentType: values.contentType, size: values.sizeBytes, originalName: values.originalName });
  const upload = await getObjectStorage().createUploadUrl({ contentType: values.contentType, size: values.sizeBytes, originalName: values.originalName, scope: blockPhotoScope(values.blockId) });
  assertBlockPhotoKey(values.blockId, upload.key);
  return { key: upload.key, uploadUrl: upload.uploadUrl };
}

export async function addBlockPhoto(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BLOCK_UPDATE);
  const values = addBlockPhotoSchema.parse(input);
  await requireAssignedBlockAccess(values.blockId);
  assertBlockPhotoKey(values.blockId, values.storageKey);
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(blockPhoto).values({ id, blockId: values.blockId, storageKey: values.storageKey, contentType: values.contentType, sizeBytes: values.sizeBytes, caption: optionalValue(values.caption ?? ""), createdBy: session.user.id, createdAt: now });
    const [currentBlock] = await tx.select({ locationPhotoKey: block.locationPhotoKey }).from(block).where(eq(block.id, values.blockId)).limit(1);
    if (!currentBlock?.locationPhotoKey) await tx.update(block).set({ locationPhotoKey: values.storageKey, updatedAt: now }).where(eq(block.id, values.blockId));
    await tx.insert(blockHistory).values({ id: crypto.randomUUID(), blockId: values.blockId, action: "PHOTO_ADDED", oldValues: null, newValues: JSON.stringify({ photoId: id, caption: values.caption ?? null }), changedBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "BLOCK_PHOTO", entityId: id, newValues: { blockId: values.blockId, caption: values.caption ?? null } }));
  });
  return { id };
}

export async function getBlockPhotoDownloadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.BLOCK_READ);
  const values = blockPhotoDownloadSchema.parse(input);
  await requireAssignedBlockAccess(values.blockId);
  const [photo] = await getDb().select({ storageKey: blockPhoto.storageKey }).from(blockPhoto).where(and(eq(blockPhoto.blockId, values.blockId), eq(blockPhoto.storageKey, values.storageKey))).limit(1);
  if (!photo) { const error = new Error("Block photo was not found."); Object.assign(error, { code: "NOT_FOUND", status: 404 }); throw error; }
  return { downloadUrl: await getObjectStorage().createDownloadUrl(photo.storageKey) };
}

export async function createBlock(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.BLOCK_CREATE);
  const values = parseBlockForm(formData);
  const [duplicate] = await getDb().select({ id: block.id }).from(block).where(eq(block.code, values.code)).limit(1);
  if (duplicate) throw new Error("A block with this code already exists.");
  const id = crypto.randomUUID();
  const now = new Date();

  await getDb().transaction(async (tx) => {
    await tx.insert(block).values({ id, ...blockValues(values), createdAt: now, updatedAt: now });
    await tx.insert(blockHistory).values({ id: crypto.randomUUID(), blockId: id, action: AUDIT_ACTIONS.CREATE, oldValues: null, newValues: JSON.stringify({ code: values.code, name: values.name, status: values.status }), changedBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BLOCK", entityId: id, newValues: { code: values.code, name: values.name, status: values.status } }));
  });

  revalidatePath("/dashboard/blocks");
  redirect("/dashboard/blocks");
}

export async function createBlockRecord(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BLOCK_CREATE);
  const parsed = blockFormSchema.safeParse(input);
  if (!parsed.success) throw new Error("Please check the block details and try again.");
  const values = parsed.data;
  const [duplicate] = await getDb().select({ id: block.id }).from(block).where(eq(block.code, values.code)).limit(1);
  if (duplicate) throw new Error("A block with this code already exists.");
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(block).values({ id, ...blockValues(values), createdAt: now, updatedAt: now });
    await tx.insert(blockHistory).values({ id: crypto.randomUUID(), blockId: id, action: AUDIT_ACTIONS.CREATE, oldValues: null, newValues: JSON.stringify({ code: values.code, name: values.name, status: values.status }), changedBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BLOCK", entityId: id, newValues: { code: values.code, name: values.name, status: values.status } }));
  });
  return getBlock(id);
}

export async function updateBlockRecord(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BLOCK_UPDATE);
  const parsed = blockFormSchema.extend({ id: blockIdSchema }).safeParse(input);
  if (!parsed.success) throw new Error("Please check the block details.");
  const { id, ...values } = parsed.data;
  const [existing] = await getDb().select().from(block).where(eq(block.id, id)).limit(1);
  if (!existing) throw new Error("Block was not found.");
  const [duplicate] = await getDb().select({ id: block.id }).from(block).where(and(eq(block.code, values.code), ne(block.id, id))).limit(1);
  if (duplicate) throw new Error("A block with this code already exists.");
  await getDb().transaction(async (tx) => {
    await tx.update(block).set(blockValues(values)).where(eq(block.id, id));
    await tx.insert(blockHistory).values({ id: crypto.randomUUID(), blockId: id, action: AUDIT_ACTIONS.UPDATE, oldValues: JSON.stringify({ code: existing.code, name: existing.name, status: existing.status }), newValues: JSON.stringify({ code: values.code, name: values.name, status: values.status }), changedBy: session.user.id, createdAt: new Date() });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "BLOCK", entityId: id, oldValues: { code: existing.code, name: existing.name, status: existing.status }, newValues: { code: values.code, name: values.name, status: values.status } }));
  });
  return getBlock(id);
}

export async function updateBlock(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.BLOCK_UPDATE);
  const id = readString(formData, "id").trim();
  if (!id) throw new Error("Block ID is required.");

  const values = parseBlockForm(formData);
  const [existing] = await getDb().select().from(block).where(eq(block.id, id)).limit(1);
  if (!existing) throw new Error("Block was not found.");
  const [duplicate] = await getDb().select({ id: block.id }).from(block).where(and(eq(block.code, values.code), ne(block.id, id))).limit(1);
  if (duplicate) throw new Error("A block with this code already exists.");

  const oldValues = { code: existing.code, name: existing.name, status: existing.status };
  const newValues = { code: values.code, name: values.name, status: values.status };
  await getDb().transaction(async (tx) => {
    await tx.update(block).set(blockValues(values)).where(eq(block.id, id));
    await tx.insert(blockHistory).values({ id: crypto.randomUUID(), blockId: id, action: AUDIT_ACTIONS.UPDATE, oldValues: JSON.stringify(oldValues), newValues: JSON.stringify(newValues), changedBy: session.user.id, createdAt: new Date() });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "BLOCK", entityId: id, oldValues, newValues }));
  });

  revalidatePath("/dashboard/blocks");
  revalidatePath(`/dashboard/blocks/${id}`);
  revalidatePath(`/dashboard/blocks/${id}/edit`);
  redirect(`/dashboard/blocks/${id}`);
}
