import { and, asc, count, desc, eq, inArray, like, ne, or } from "drizzle-orm";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { block } from "@/src/db/schema/blocks";
import { businessActor } from "@/src/db/schema/business-actors";
import { due } from "@/src/db/schema/dues";
import { excavator, excavatorMovement } from "@/src/db/schema/excavators";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getAssignedBlockIdsForCurrentUser, requireAssignedBlockAccess } from "@/src/features/field-operations/service";
import { getObjectStorage, validateImageUpload } from "@/src/lib/storage";

import { getFinanceDefaults } from "../settings/service";
import { notifyPermissionHolders } from "../notifications/service";

import { blockIdSchema, excavatorFiltersSchema, excavatorIdSchema, excavatorPhotoDownloadSchema, excavatorPhotoUploadSchema, recordExcavatorMovementSchema, registerExcavatorSchema, setExcavatorPhotoSchema, updateExcavatorSchema } from "./schema";

function parseInput<T>(result: { success: boolean; data?: T }): T {
  if (!result.success || !result.data) throw new Error("Please check the excavator details and try again.");
  return result.data;
}

function optionalValue(value?: string): string | null {
  return value?.trim() ? value.trim() : null;
}

function excavatorPhotoScope(excavatorId: string): string { return `excavators/${excavatorId}`; }

function assertExcavatorPhotoKey(excavatorId: string, storageKey: string): void {
  const scope = `${excavatorPhotoScope(excavatorId)}/`;
  const suffix = storageKey.startsWith(scope) ? storageKey.slice(scope.length) : "";
  if (!suffix || suffix.includes("/") || suffix.includes("\\") || suffix.includes("..")) throw new Error("Excavator photo key is outside the permitted storage scope.");
}

function dateFromTimestamp(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateToTimestamp(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

async function assertBlockExists(id: string): Promise<void> {
  const [targetBlock] = await getDb().select({ id: block.id }).from(block).where(eq(block.id, id)).limit(1);
  if (!targetBlock) throw new Error("Target block was not found.");
}

async function assertBusinessActorExists(id: string): Promise<void> {
  const [actor] = await getDb().select({ id: businessActor.id }).from(businessActor).where(eq(businessActor.id, id)).limit(1);
  if (!actor) throw new Error("Business actor was not found.");
}

export async function getExcavators(input?: unknown) {
  await requirePermission(PERMISSIONS.EXCAVATOR_READ);
  const filters = excavatorFiltersSchema.parse(input ?? {});
  const conditions = [];
  if (filters.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(or(like(excavator.unitCode, pattern), like(excavator.brand, pattern), like(excavator.model, pattern)));
  }
  if (filters.operatorName) conditions.push(like(excavator.operatorName, `%${filters.operatorName}%`));
  if (filters.status) conditions.push(eq(excavator.status, filters.status));
  if (filters.blockId) conditions.push(eq(excavator.currentBlockId, filters.blockId));
  const assignedBlockIds = await getAssignedBlockIdsForCurrentUser();
  if (assignedBlockIds) {
    if (!assignedBlockIds.length) return [];
    conditions.push(inArray(excavator.currentBlockId, assignedBlockIds));
  }

  return getDb()
    .select({
      id: excavator.id,
      unitCode: excavator.unitCode,
      brand: excavator.brand,
      model: excavator.model,
      businessActorId: excavator.businessActorId,
      businessActorName: businessActor.name,
      operatorName: excavator.operatorName,
      photoKey: excavator.photoKey,
      photoContentType: excavator.photoContentType,
      photoSizeBytes: excavator.photoSizeBytes,
      currentBlockId: excavator.currentBlockId,
      currentBlockCode: block.code,
      currentBlockName: block.name,
      currentEntryDate: excavator.currentEntryDate,
      lastExitDate: excavator.lastExitDate,
      status: excavator.status,
    })
    .from(excavator)
    .leftJoin(businessActor, eq(businessActor.id, excavator.businessActorId))
    .leftJoin(block, eq(block.id, excavator.currentBlockId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(excavator.unitCode))
    .limit(100);
}

export async function getExcavatorPage(input?: unknown) {
  await requirePermission(PERMISSIONS.EXCAVATOR_READ);
  const filters = excavatorFiltersSchema.parse(input ?? {});
  const conditions = [];
  if (filters.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(or(like(excavator.unitCode, pattern), like(excavator.brand, pattern), like(excavator.model, pattern)));
  }
  if (filters.operatorName) conditions.push(like(excavator.operatorName, `%${filters.operatorName}%`));
  if (filters.status) conditions.push(eq(excavator.status, filters.status));
  if (filters.blockId) conditions.push(eq(excavator.currentBlockId, filters.blockId));
  const assignedBlockIds = await getAssignedBlockIdsForCurrentUser();
  if (assignedBlockIds) {
    if (!assignedBlockIds.length) return { rows: [], pagination: { page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 0 } };
    conditions.push(inArray(excavator.currentBlockId, assignedBlockIds));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (filters.page - 1) * filters.pageSize;
  const database = getDb();
  const [rows, totalRows] = await Promise.all([
    database.select().from(excavator).leftJoin(businessActor, eq(businessActor.id, excavator.businessActorId)).leftJoin(block, eq(block.id, excavator.currentBlockId)).where(where).orderBy(asc(excavator.unitCode)).limit(filters.pageSize).offset(offset),
    database.select({ value: count() }).from(excavator).where(where),
  ]);
  const total = Number(totalRows[0]?.value ?? 0);
  return { rows, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function getExcavator(id: string) {
  await requirePermission(PERMISSIONS.EXCAVATOR_READ);
  const validId = parseInput(excavatorIdSchema.safeParse(id));
  const [scope] = await getDb().select({ currentBlockId: excavator.currentBlockId }).from(excavator).where(eq(excavator.id, validId)).limit(1);
  if (scope?.currentBlockId) await requireAssignedBlockAccess(scope.currentBlockId);
  const [item] = await getDb().select().from(excavator).where(eq(excavator.id, validId)).limit(1);
  if (!item) return null;

  const movements = await getDb()
    .select()
    .from(excavatorMovement)
    .where(eq(excavatorMovement.excavatorId, validId))
    .orderBy(desc(excavatorMovement.occurredAt));

  return { item, movements };
}

export async function registerExcavator(input: unknown) {
  const session = await requirePermission(PERMISSIONS.EXCAVATOR_MANAGE);
  const values = parseInput(registerExcavatorSchema.safeParse(input));
  const database = getDb();
  const [existing] = await database
    .select({ id: excavator.id })
    .from(excavator)
    .where(eq(excavator.unitCode, values.unitCode))
    .limit(1);
  if (existing) throw new Error("An excavator with this unit code already exists.");

  if (values.currentBlockId) await assertBlockExists(values.currentBlockId);
  await assertBusinessActorExists(values.businessActorId);
  if (values.currentBlockId) await requireAssignedBlockAccess(values.currentBlockId, values.entryDate);

  const id = crypto.randomUUID();
  const now = new Date();
  const isActive = Boolean(values.currentBlockId);
  const financeDefaults = await getFinanceDefaults();

  await database.transaction(async (tx) => {
    await tx.insert(excavator).values({
      id,
      unitCode: values.unitCode,
      brand: values.brand,
      model: values.model,
      businessActorId: values.businessActorId,
      operatorName: optionalValue(values.operatorName),
      currentBlockId: values.currentBlockId ?? null,
      currentEntryDate: values.entryDate ?? null,
      status: isActive ? "ACTIVE" : "INACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    if (values.currentBlockId && values.entryDate) {
      const movementId = crypto.randomUUID();
      await tx.insert(excavatorMovement).values({
        id: movementId,
        excavatorId: id,
        fromBlockId: null,
        toBlockId: values.currentBlockId,
        movementType: "ENTRY",
        occurredAt: dateToTimestamp(values.entryDate),
        notes: optionalValue(values.notes),
        createdBy: session.user.id,
        createdAt: now,
      });
      if (financeDefaults.roadEntryAutomationEnabled) {
        const [actor] = await tx.select({ name: businessActor.name }).from(businessActor).where(eq(businessActor.id, values.businessActorId)).limit(1);
        await tx.insert(due).values({ id: crypto.randomUUID(), excavatorId: id, blockId: values.currentBlockId, businessActorId: values.businessActorId, sourceMovementId: movementId, dueType: "ROAD_ENTRY", referenceKey: `ENTRY-${movementId}`, payerName: actor?.name ?? values.unitCode, amountDue: financeDefaults.roadEntryDueAmount, amountPaid: 0, status: "UNPAID", dueDate: values.entryDate, createdBy: session.user.id, createdAt: now, updatedAt: now });
      }
    }

    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.CREATE,
        entityType: "EXCAVATOR",
        entityId: id,
        newValues: { unitCode: values.unitCode, status: isActive ? "ACTIVE" : "INACTIVE", currentBlockId: values.currentBlockId ?? null },
      }),
    );
  });

  if (values.currentBlockId && values.entryDate) {
    await notifyPermissionHolders({ permission: PERMISSIONS.DUES_MANAGE, ruleKey: "EXCAVATOR_ENTRY", targetKey: id, type: "EXCAVATOR_ENTRY", title: "Excavator entered a block", body: `${values.unitCode} entered a block and requires dues review.`, relatedEntityType: "EXCAVATOR", relatedEntityId: id });
  }

  return { id };
}

export async function updateExcavator(input: unknown) {
  const session = await requirePermission(PERMISSIONS.EXCAVATOR_MANAGE);
  const values = parseInput(updateExcavatorSchema.safeParse(input));
  const database = getDb();
  const [current] = await database.select().from(excavator).where(eq(excavator.id, values.id)).limit(1);
  if (!current) throw new Error("Excavator was not found.");
  if (current.currentBlockId) await requireAssignedBlockAccess(current.currentBlockId);
  const [duplicate] = await database.select({ id: excavator.id }).from(excavator).where(and(eq(excavator.unitCode, values.unitCode), ne(excavator.id, values.id))).limit(1);
  if (duplicate) throw new Error("An excavator with this unit code already exists.");
  const now = new Date();
  await database.transaction(async (tx) => {
    await tx.update(excavator).set({ unitCode: values.unitCode, brand: values.brand, model: values.model, operatorName: optionalValue(values.operatorName), updatedAt: now }).where(eq(excavator.id, current.id));
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "EXCAVATOR", entityId: current.id, oldValues: { unitCode: current.unitCode, brand: current.brand, model: current.model, operatorName: current.operatorName }, newValues: values }));
  });
  return { id: current.id };
}

export async function createExcavatorPhotoUploadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.EXCAVATOR_MANAGE);
  const values = excavatorPhotoUploadSchema.parse(input);
  const [current] = await getDb().select({ id: excavator.id, currentBlockId: excavator.currentBlockId }).from(excavator).where(eq(excavator.id, values.excavatorId)).limit(1);
  if (!current) throw new Error("Excavator was not found.");
  if (current.currentBlockId) await requireAssignedBlockAccess(current.currentBlockId);
  validateImageUpload({ contentType: values.contentType, size: values.sizeBytes, originalName: values.originalName });
  const upload = await getObjectStorage().createUploadUrl({ contentType: values.contentType, size: values.sizeBytes, originalName: values.originalName, scope: excavatorPhotoScope(values.excavatorId) });
  assertExcavatorPhotoKey(values.excavatorId, upload.key);
  return { key: upload.key, uploadUrl: upload.uploadUrl, contentType: values.contentType, sizeBytes: values.sizeBytes };
}

export async function setExcavatorPhoto(input: unknown) {
  const session = await requirePermission(PERMISSIONS.EXCAVATOR_MANAGE);
  const values = setExcavatorPhotoSchema.parse(input);
  const [current] = await getDb().select({ id: excavator.id, currentBlockId: excavator.currentBlockId }).from(excavator).where(eq(excavator.id, values.excavatorId)).limit(1);
  if (!current) throw new Error("Excavator was not found.");
  if (current.currentBlockId) await requireAssignedBlockAccess(current.currentBlockId);
  assertExcavatorPhotoKey(values.excavatorId, values.storageKey);
  await getDb().update(excavator).set({ photoKey: values.storageKey, photoContentType: values.contentType, photoSizeBytes: values.sizeBytes, updatedAt: new Date() }).where(eq(excavator.id, values.excavatorId));
  await getDb().insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "EXCAVATOR", entityId: values.excavatorId, newValues: { photoKey: values.storageKey, photoContentType: values.contentType, photoSizeBytes: values.sizeBytes } }));
  return { id: values.excavatorId, photoKey: values.storageKey };
}

export async function getExcavatorPhotoDownloadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.EXCAVATOR_READ);
  const values = excavatorPhotoDownloadSchema.parse(input);
  const [current] = await getDb().select({ photoKey: excavator.photoKey, currentBlockId: excavator.currentBlockId }).from(excavator).where(eq(excavator.id, values.excavatorId)).limit(1);
  if (!current) throw new Error("Excavator was not found.");
  if (current.currentBlockId) await requireAssignedBlockAccess(current.currentBlockId);
  if (current.photoKey !== values.storageKey) throw new Error("Excavator photo was not found.");
  assertExcavatorPhotoKey(values.excavatorId, values.storageKey);
  return { downloadUrl: await getObjectStorage().createDownloadUrl(values.storageKey) };
}

export async function recordExcavatorMovement(input: unknown) {
  const session = await requirePermission(PERMISSIONS.EXCAVATOR_MANAGE);
  const values = parseInput(recordExcavatorMovementSchema.safeParse(input));
  const database = getDb();
  const [current] = await database
    .select()
    .from(excavator)
    .where(eq(excavator.id, values.excavatorId))
    .limit(1);
  if (!current) throw new Error("Excavator was not found.");

  if (values.toBlockId) {
    const validBlockId = parseInput(blockIdSchema.safeParse(values.toBlockId));
    await assertBlockExists(validBlockId);
  }

  const occurredAt = values.occurredAt ?? new Date();
  const occurredDate = dateFromTimestamp(occurredAt);
  const isExit = values.movementType === "EXIT";

  if (isExit && values.toBlockId) throw new Error("An exit cannot have a destination block.");
  if (!isExit && !values.toBlockId) throw new Error("An entry or transfer requires a destination block.");
  if (values.movementType === "ENTRY" && current.currentBlockId) throw new Error("Excavator is already active in a block. Use transfer or exit.");
  if (values.movementType === "TRANSFER" && !current.currentBlockId) throw new Error("An inactive excavator must enter a block before it can transfer.");
  if (values.movementType === "TRANSFER" && values.toBlockId === current.currentBlockId) throw new Error("Destination block must be different from the current block.");
  if (isExit && !current.currentBlockId) throw new Error("Only an active excavator can exit a block.");
  if (current.currentBlockId) await requireAssignedBlockAccess(current.currentBlockId, occurredDate);
  if (values.toBlockId) await requireAssignedBlockAccess(values.toBlockId, occurredDate);

  const status = isExit ? "EXITED" : "ACTIVE";
  const nextBlockId = isExit ? null : values.toBlockId!;
  const financeDefaults = await getFinanceDefaults();

  await database.transaction(async (tx) => {
    const movementId = crypto.randomUUID();
    await tx.insert(excavatorMovement).values({
      id: movementId,
      excavatorId: current.id,
      fromBlockId: current.currentBlockId,
      toBlockId: nextBlockId,
      movementType: values.movementType,
      occurredAt,
      notes: optionalValue(values.notes),
      createdBy: session.user.id,
      createdAt: new Date(),
    });

    if (values.movementType === "ENTRY" && financeDefaults.roadEntryAutomationEnabled) {
      const [actor] = current.businessActorId ? await tx.select({ name: businessActor.name }).from(businessActor).where(eq(businessActor.id, current.businessActorId)).limit(1) : [];
      await tx.insert(due).values({ id: crypto.randomUUID(), excavatorId: current.id, blockId: nextBlockId, businessActorId: current.businessActorId, sourceMovementId: movementId, dueType: "ROAD_ENTRY", referenceKey: `ENTRY-${movementId}`, payerName: actor?.name ?? current.operatorName ?? current.unitCode, amountDue: financeDefaults.roadEntryDueAmount, amountPaid: 0, status: "UNPAID", dueDate: occurredDate, createdBy: session.user.id, createdAt: new Date(), updatedAt: new Date() });
    }

    await tx
      .update(excavator)
      .set({
        currentBlockId: nextBlockId,
        currentEntryDate: isExit ? current.currentEntryDate : occurredDate,
        lastExitDate: isExit ? occurredDate : current.lastExitDate,
        status,
        updatedAt: new Date(),
      })
      .where(eq(excavator.id, current.id));

    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.STATUS_CHANGE,
        entityType: "EXCAVATOR",
        entityId: current.id,
        oldValues: { status: current.status, currentBlockId: current.currentBlockId },
        newValues: { status, currentBlockId: nextBlockId, movementType: values.movementType },
      }),
    );
  });

  if (values.movementType === "ENTRY") {
    await notifyPermissionHolders({ permission: PERMISSIONS.DUES_MANAGE, ruleKey: "EXCAVATOR_ENTRY", targetKey: `${current.id}:${occurredAt.toISOString()}`, type: "EXCAVATOR_ENTRY", title: "Excavator entered a block", body: `${current.unitCode} entered a block and requires dues review.`, relatedEntityType: "EXCAVATOR", relatedEntityId: current.id });
  }

  return { excavatorId: current.id, status, currentBlockId: nextBlockId };
}
